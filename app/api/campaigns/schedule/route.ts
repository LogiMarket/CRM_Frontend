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
    const message = String(body?.message || "").trim()
    const sendMode: SendMode = (String(body?.sendMode || "auto") as SendMode)
    const contactIds = Array.isArray(body?.contactIds) ? body.contactIds.map((x: any) => String(x).trim()).filter(Boolean) : []

    const scheduledAtRaw = String(body?.scheduledAt || "").trim()
    const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null

    const whatsappTemplate: WhatsappTemplateSpec | null = body?.whatsappTemplate
      ? {
          name: String(body.whatsappTemplate?.name || "").trim(),
          language: String(body.whatsappTemplate?.language || "").trim(),
          bodyParams: Array.isArray(body.whatsappTemplate?.bodyParams)
            ? body.whatsappTemplate.bodyParams.map((x: any) => String(x ?? "")).filter((x: string) => x.trim().length > 0)
            : [],
        }
      : null

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 })
    }
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "scheduledAt is required" }, { status: 400 })
    }
    if (!contactIds.length) {
      return NextResponse.json({ error: "contactIds is required" }, { status: 400 })
    }

    const db = sql
    await ensureBulkCampaignTables(db)

    const campaignId = await createBulkCampaign(db, {
      name,
      message,
      sendMode,
      whatsappTemplate: sendMode === "text" ? null : whatsappTemplate,
      total: contactIds.length,
      createdBy: (user as any)?.id,
      scheduledAt,
      status: "scheduled",
    })

    return NextResponse.json({ campaignId })
  } catch (error) {
    console.error("[Campaigns Schedule] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
