import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { isDemoMode, sql } from "@/lib/db"

export const runtime = "nodejs"

type Db = NonNullable<typeof sql>

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

function formatDate(value: any) {
  try {
    const d = value ? new Date(value) : null
    if (!d || Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
    return d.toISOString().slice(0, 10)
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
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

async function loadCampaignsFromWebhookLogs(db: Db) {
  await ensureWebhookLogsTable(db)
  try {
    const rows: any[] = await db`
      SELECT DISTINCT ON (external_id)
        external_id,
        payload,
        created_at
      FROM webhook_logs
      WHERE channel = 'bulk_campaign'
        AND external_id IS NOT NULL
      ORDER BY external_id, created_at DESC
      LIMIT 50
    `

    return (rows || []).map((r) => {
      const p = r?.payload || {}
      const id = String(r?.external_id || "")
      const status = String(p?.status || "scheduled") as BulkCampaignStatus
      const total = Number(p?.total || 0)
      const sent = Number(p?.sent || 0)
      const failed = Number(p?.failed || 0)
      const skipped = Number(p?.skipped || 0)
      const date = formatDate(p?.completedAt || p?.startedAt || p?.scheduledAt || p?.createdAt || r?.created_at)

      return {
        id,
        name: String(p?.name || "Campaña"),
        status,
        recipients: total,
        delivered: sent,
        read: 0,
        replied: 0,
        failed,
        skipped,
        date,
        message: String(p?.message || ""),
      }
    })
  } catch {
    return []
  }
}

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    if (isDemoMode) {
      return NextResponse.json({ campaigns: [] }, { status: 200 })
    }

    if (!sql) {
      return NextResponse.json(
        {
          error: "DATABASE_URL missing",
          hint: "Configura DATABASE_URL para poder listar campañas.",
        },
        { status: 500 },
      )
    }

    const db = sql
    await ensureBulkCampaignTables(db)

    const fromLogs = await loadCampaignsFromWebhookLogs(db)

    let rows: any[] = []
    try {
      rows = await db`
        SELECT
          id,
          name,
          message,
          status,
          total,
          sent,
          failed,
          skipped,
          scheduled_at,
          started_at,
          completed_at,
          created_at
        FROM bulk_campaigns
        ORDER BY created_at DESC
        LIMIT 50
      `
    } catch {
      rows = []
    }

    // Fallback: derive campaigns from messages.metadata if bulk_campaigns is empty/unavailable
    if (!rows || rows.length === 0) {
      try {
        const agg: any[] = await db`
          WITH m AS (
            SELECT
              (metadata->>'campaignId') AS campaign_id,
              COALESCE(NULLIF(metadata->>'campaignName', ''), 'Campaña') AS name,
              MAX(created_at) AS last_at,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE (metadata->>'source') = 'bulk' AND (metadata->'send'->>'ok') = 'true') AS sent,
              COUNT(*) FILTER (WHERE (metadata->>'source') = 'bulk' AND (metadata->'send'->>'skipped') = 'true') AS skipped,
              COUNT(*) FILTER (
                WHERE (metadata->>'source') = 'bulk'
                  AND (metadata->'send'->>'ok') = 'false'
                  AND COALESCE((metadata->'send'->>'skipped'), 'false') != 'true'
              ) AS failed
            FROM messages
            WHERE (metadata->>'campaignId') IS NOT NULL
              AND (metadata->>'source') = 'bulk'
            GROUP BY 1, 2
          )
          SELECT *
          FROM m
          ORDER BY last_at DESC
          LIMIT 50
        `

        const campaigns = (agg || []).map((r) => {
          const total = Number(r?.total || 0)
          const sent = Number(r?.sent || 0)
          const failed = Number(r?.failed || 0)
          const skipped = Number(r?.skipped || 0)
          const date = formatDate(r?.last_at)
          const status: BulkCampaignStatus = failed === 0 ? "completed" : sent > 0 ? "completed" : "failed"

          return {
            id: String(r?.campaign_id || ""),
            name: String(r?.name || "Campaña"),
            status,
            recipients: total,
            delivered: sent,
            read: 0,
            replied: 0,
            failed,
            skipped,
            date,
            message: "",
          }
        })

        // Merge with webhook_logs campaigns (scheduled/sending) and dedupe by id
        const byId = new Map<string, any>()
        for (const c of [...fromLogs, ...campaigns]) {
          if (!c?.id) continue
          if (!byId.has(c.id)) byId.set(c.id, c)
        }
        return NextResponse.json({ campaigns: Array.from(byId.values()).slice(0, 50) })
      } catch {
        // ignore
      }
    }

    const campaigns = (rows || []).map((r) => {
      const status = String(r?.status || "scheduled") as BulkCampaignStatus
      const recipients = Number(r?.total || 0)
      const delivered = Number(r?.sent || 0)
      const failed = Number(r?.failed || 0)
      const skipped = Number(r?.skipped || 0)

      const date = formatDate(r?.completed_at || r?.started_at || r?.scheduled_at || r?.created_at)

      return {
        id: String(r?.id),
        name: String(r?.name || "Campaña"),
        status,
        recipients,
        delivered,
        read: 0,
        replied: 0,
        failed,
        skipped,
        date,
        message: String(r?.message || ""),
      }
    })

    // Merge with webhook_logs campaigns and dedupe by id
    const byId = new Map<string, any>()
    for (const c of [...fromLogs, ...campaigns]) {
      if (!c?.id) continue
      if (!byId.has(c.id)) byId.set(c.id, c)
    }

    return NextResponse.json({ campaigns: Array.from(byId.values()).slice(0, 50) })
  } catch (error) {
    console.error("[Campaigns List] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
