import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { isDemoMode, sql } from "@/lib/db"

export const runtime = "nodejs"

type Db = NonNullable<typeof sql>

type WhatsappTemplateSpec = {
  name: string
  language: string
  bodyParams?: string[]
}

function normalizeTemplateLanguageCode(value: string) {
  const raw = String(value || "").trim()
  if (!raw) return ""

  const v = raw.replace(/-/g, "_")
  if (v.toLowerCase() === "es_mex") return "es_MX"

  const parts = v.split("_").filter(Boolean)
  if (parts.length === 1) return parts[0].toLowerCase()
  const [lang, region] = parts
  return `${String(lang).toLowerCase()}_${String(region).toUpperCase()}`
}

type SendMode = "auto" | "text" | "template"

type BulkCampaignStatus = "scheduled" | "sending" | "completed" | "failed"

async function ensureBulkCampaignTables(db: Db) {
  try {
    await db`
      CREATE TABLE IF NOT EXISTS bulk_campaigns (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        message TEXT NOT NULL,
        send_mode VARCHAR(20) DEFAULT 'auto',
        whatsapp_template JSONB,
        status VARCHAR(20) DEFAULT 'scheduled',
        total INTEGER DEFAULT 0,
        sent INTEGER DEFAULT 0,
        failed INTEGER DEFAULT 0,
        skipped INTEGER DEFAULT 0,
        scheduled_at TIMESTAMP NULL,
        started_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        created_by INTEGER NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    await db`CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_status ON bulk_campaigns(status)`
    await db`CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_created_at ON bulk_campaigns(created_at)`
  } catch {
    // ignore
  }
}

async function createBulkCampaign(
  db: Db,
  input: {
    name: string
    message: string
    sendMode: SendMode
    whatsappTemplate: WhatsappTemplateSpec | null
    total: number
    createdBy: any
    scheduledAt: Date
    status: BulkCampaignStatus
  },
) {
  try {
    const rows: any[] = await db`
      INSERT INTO bulk_campaigns (name, message, send_mode, whatsapp_template, status, total, scheduled_at, created_by, created_at, updated_at)
      VALUES (
        ${input.name},
        ${input.message},
        ${input.sendMode},
        ${input.whatsappTemplate ? JSON.stringify(input.whatsappTemplate) : null}::jsonb,
        ${input.status},
        ${input.total},
        ${input.scheduledAt},
        ${typeof input.createdBy === "number" ? input.createdBy : null},
        NOW(),
        NOW()
      )
      RETURNING id
    `
    return rows?.[0]?.id ? String(rows[0].id) : null
  } catch {
    return null
  }
}

function generateFallbackCampaignId() {
  return `bulk_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

async function ensureWebhookLogsTable(db: Db) {
  try {
    await db`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id SERIAL PRIMARY KEY,
        channel VARCHAR(50) NOT NULL,
        external_id VARCHAR(255),
        payload JSONB,
        processed BOOLEAN DEFAULT FALSE,
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    await db`CREATE INDEX IF NOT EXISTS idx_webhook_logs_channel ON webhook_logs(channel)`
    await db`CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON webhook_logs(processed)`
  } catch {
    // ignore
  }
}

async function recordCampaignEvent(db: Db, campaignId: string, payload: any) {
  try {
    await ensureWebhookLogsTable(db)
    await db`
      INSERT INTO webhook_logs (channel, external_id, payload, processed)
      VALUES ('bulk_campaign', ${campaignId}, ${JSON.stringify(payload)}::jsonb, true)
    `
    return true
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    if (isDemoMode) {
      return NextResponse.json({ error: "Bulk send is not available in demo mode" }, { status: 400 })
    }

    if (!sql) {
      return NextResponse.json(
        {
          error: "DATABASE_URL missing",
          hint: "Configura DATABASE_URL para poder programar campañas.",
        },
        { status: 500 },
      )
    }

    const body = await request.json().catch(() => ({}))

    const name = String(body?.name || "").trim() || "Campaña"
    const messageRaw = String(body?.message || "")
    const message = messageRaw.trim()
    const sendMode: SendMode = (String(body?.sendMode || "auto") as SendMode)
    const contactIds = Array.isArray(body?.contactIds) ? body.contactIds.map((x: any) => String(x).trim()).filter(Boolean) : []

    const scheduledAtRaw = String(body?.scheduledAt || "").trim()
    const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null

    const whatsappTemplate: WhatsappTemplateSpec | null = body?.whatsappTemplate
      ? {
          name: String(body.whatsappTemplate?.name || "").trim().toLowerCase(),
          language: normalizeTemplateLanguageCode(String(body.whatsappTemplate?.language || "")),
          bodyParams: Array.isArray(body.whatsappTemplate?.bodyParams)
            ? body.whatsappTemplate.bodyParams.map((x: any) => String(x ?? "")).filter((x: string) => x.trim().length > 0)
            : [],
        }
      : null

    if (sendMode !== "template") {
      return NextResponse.json(
        { error: "Bulk schedule only supports WhatsApp templates (sendMode must be 'template')" },
        { status: 400 },
      )
    }

    if (!whatsappTemplate || !whatsappTemplate.name || !whatsappTemplate.language) {
      return NextResponse.json(
        { error: "whatsappTemplate (name/language) is required" },
        { status: 400 },
      )
    }

    const persistedMessage = message || `[TEMPLATE:${whatsappTemplate.name} ${whatsappTemplate.language}]`.trim()
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "scheduledAt is required" }, { status: 400 })
    }
    if (!contactIds.length) {
      return NextResponse.json({ error: "contactIds is required" }, { status: 400 })
    }

    const db = sql
    await ensureBulkCampaignTables(db)

    let campaignId = await createBulkCampaign(db, {
      name,
      message: persistedMessage,
      sendMode,
      whatsappTemplate,
      total: contactIds.length,
      createdBy: (user as any)?.id,
      scheduledAt,
      status: "scheduled",
    })

    // Fallback: if bulk_campaigns couldn't be written (permissions/schema), persist via webhook_logs
    if (!campaignId) {
      campaignId = generateFallbackCampaignId()
      await recordCampaignEvent(db, campaignId, {
        kind: "campaign",
        id: campaignId,
        name,
        message: persistedMessage,
        sendMode,
        whatsappTemplate,
        status: "scheduled",
        total: contactIds.length,
        sent: 0,
        failed: 0,
        skipped: 0,
        scheduledAt: scheduledAt.toISOString(),
        createdAt: new Date().toISOString(),
      })

      return NextResponse.json({ campaignId, persisted: false, storage: "webhook_logs" })
    }

    return NextResponse.json({ campaignId, persisted: true, storage: "bulk_campaigns" })
  } catch (error) {
    console.error("[Campaigns Schedule] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
