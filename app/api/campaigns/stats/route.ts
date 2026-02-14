import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { isDemoMode, sql } from "@/lib/db"

export const runtime = "nodejs"

type Db = NonNullable<typeof sql>

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

async function hasMessagesExtendedCols(db: Db): Promise<boolean> {
  try {
    const rows = await db`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'messages'
        AND column_name IN ('direction', 'metadata', 'read_at')
      ORDER BY column_name
    `
    return Array.isArray(rows) && rows.length === 3
  } catch {
    return false
  }
}

async function getMessagesColumns(db: Db): Promise<Set<string>> {
  try {
    const rows: any[] = await db`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'messages'
        AND column_name IN ('direction', 'metadata', 'read_at', 'sender_type', 'conversation_id', 'created_at')
      ORDER BY column_name
    `
    return new Set((rows || []).map((r) => String(r?.column_name || "").trim()).filter(Boolean))
  } catch {
    return new Set()
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

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    if (isDemoMode) {
      return NextResponse.json({ error: "Stats not available in demo mode" }, { status: 400 })
    }

    if (!sql) {
      return NextResponse.json(
        {
          error: "DATABASE_URL missing",
          hint: "Configura DATABASE_URL para calcular estadísticas.",
        },
        { status: 500 },
      )
    }

    const db = sql
    await ensureBulkCampaignTables(db)

    let activeCampaigns = 0
    let totalSent = 0
    let totalFailed = 0
    let totalSkipped = 0

    const computeFromMessages = async () => {
      try {
        const rows: any[] = await db`
          SELECT
            COUNT(*) FILTER (WHERE (metadata->>'source') = 'bulk' AND (metadata->'send'->>'ok') = 'true') AS sent,
            COUNT(*) FILTER (WHERE (metadata->>'source') = 'bulk' AND (metadata->'send'->>'skipped') = 'true') AS skipped,
            COUNT(*) FILTER (
              WHERE (metadata->>'source') = 'bulk'
                AND (metadata->'send'->>'ok') = 'false'
                AND COALESCE((metadata->'send'->>'skipped'), 'false') != 'true'
            ) AS failed
          FROM messages
          WHERE (metadata->>'campaignId') IS NOT NULL
        `
        totalSent = Number(rows?.[0]?.sent || 0)
        totalFailed = Number(rows?.[0]?.failed || 0)
        totalSkipped = Number(rows?.[0]?.skipped || 0)
      } catch {
        // ignore
      }
    }

    try {
      const rows: any[] = await db`
        SELECT
          COALESCE(SUM(sent), 0) AS sent,
          COALESCE(SUM(failed), 0) AS failed,
          COALESCE(SUM(skipped), 0) AS skipped
        FROM bulk_campaigns
      `
      totalSent = Number(rows?.[0]?.sent || 0)
      totalFailed = Number(rows?.[0]?.failed || 0)
      totalSkipped = Number(rows?.[0]?.skipped || 0)
    } catch {
      await computeFromMessages()
    }

    try {
      const rows: any[] = await db`
        SELECT COUNT(*) AS c
        FROM bulk_campaigns
        WHERE status IN ('scheduled', 'sending')
      `
      activeCampaigns = Number(rows?.[0]?.c || 0)
    } catch {
      // ignore
    }

    // Fallback/augmentation for active campaigns persisted as events in webhook_logs
    try {
      await ensureWebhookLogsTable(db)
      const rows: any[] = await db`
        WITH latest AS (
          SELECT DISTINCT ON (external_id)
            external_id,
            payload,
            created_at
          FROM webhook_logs
          WHERE channel = 'bulk_campaign'
            AND external_id IS NOT NULL
            AND external_id !~ '^[0-9]+$'
          ORDER BY external_id, created_at DESC
        )
        SELECT COUNT(*) AS c
        FROM latest
        WHERE COALESCE((payload->>'status'), '') IN ('scheduled', 'sending')
      `
      const activeFromLogs = Number(rows?.[0]?.c || 0)
      activeCampaigns = Math.max(activeCampaigns, activeFromLogs)
    } catch {
      // ignore
    }

    let readRate = 0
    let responseRate = 0

    const cols = await getMessagesColumns(db)
    const hasMetadata = cols.has("metadata")
    const hasReadAt = cols.has("read_at")
    const hasDirection = cols.has("direction")
    const hasSenderType = cols.has("sender_type")

    // Read rate
    if (hasMetadata) {
      try {
        if (hasReadAt && hasDirection) {
          const rows: any[] = await db`
            SELECT
              COUNT(*) FILTER (WHERE read_at IS NOT NULL) AS read_count,
              COUNT(*) AS total_count
            FROM messages
            WHERE direction = 'outbound'
              AND (metadata->>'campaignId') IS NOT NULL
              AND COALESCE((metadata->>'source'), '') = 'bulk'
          `
          const readCount = Number(rows?.[0]?.read_count || 0)
          const totalCount = Number(rows?.[0]?.total_count || 0)
          readRate = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0
        } else if (hasDirection) {
          // Fallback if read_at doesn't exist: use last webhook status stored in metadata.
          const rows: any[] = await db`
            SELECT
              COUNT(*) FILTER (WHERE (metadata->>'whatsappStatus') = 'read') AS read_count,
              COUNT(*) AS total_count
            FROM messages
            WHERE direction = 'outbound'
              AND (metadata->>'campaignId') IS NOT NULL
              AND COALESCE((metadata->>'source'), '') = 'bulk'
          `
          const readCount = Number(rows?.[0]?.read_count || 0)
          const totalCount = Number(rows?.[0]?.total_count || 0)
          readRate = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0
        } else if (hasSenderType) {
          // Fallback without direction column.
          const rows: any[] = await db`
            SELECT
              COUNT(*) FILTER (WHERE (metadata->>'whatsappStatus') = 'read') AS read_count,
              COUNT(*) AS total_count
            FROM messages
            WHERE sender_type = 'agent'
              AND (metadata->>'campaignId') IS NOT NULL
              AND COALESCE((metadata->>'source'), '') = 'bulk'
          `
          const readCount = Number(rows?.[0]?.read_count || 0)
          const totalCount = Number(rows?.[0]?.total_count || 0)
          readRate = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0
        }
      } catch {
        // ignore
      }
    }

    // Response rate
    if (hasMetadata) {
      try {
        if (hasDirection) {
          const rows: any[] = await db`
            WITH last_outbound AS (
              SELECT conversation_id, MAX(created_at) AS last_out_at
              FROM messages
              WHERE direction = 'outbound'
                AND (metadata->>'campaignId') IS NOT NULL
                AND COALESCE((metadata->>'source'), '') = 'bulk'
              GROUP BY conversation_id
            ), replied AS (
              SELECT DISTINCT m.conversation_id
              FROM messages m
              JOIN last_outbound lo ON lo.conversation_id = m.conversation_id
              WHERE m.direction = 'inbound'
                AND m.created_at > lo.last_out_at
            )
            SELECT
              (SELECT COUNT(*) FROM last_outbound) AS total,
              (SELECT COUNT(*) FROM replied) AS replied
          `
          const total = Number(rows?.[0]?.total || 0)
          const replied = Number(rows?.[0]?.replied || 0)
          responseRate = total > 0 ? Math.round((replied / total) * 100) : 0
        } else if (hasSenderType) {
          const rows: any[] = await db`
            WITH last_outbound AS (
              SELECT conversation_id, MAX(created_at) AS last_out_at
              FROM messages
              WHERE sender_type = 'agent'
                AND (metadata->>'campaignId') IS NOT NULL
                AND COALESCE((metadata->>'source'), '') = 'bulk'
              GROUP BY conversation_id
            ), replied AS (
              SELECT DISTINCT m.conversation_id
              FROM messages m
              JOIN last_outbound lo ON lo.conversation_id = m.conversation_id
              WHERE m.sender_type IN ('customer','contact')
                AND m.created_at > lo.last_out_at
            )
            SELECT
              (SELECT COUNT(*) FROM last_outbound) AS total,
              (SELECT COUNT(*) FROM replied) AS replied
          `
          const total = Number(rows?.[0]?.total || 0)
          const replied = Number(rows?.[0]?.replied || 0)
          responseRate = total > 0 ? Math.round((replied / total) * 100) : 0
        }
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      activeCampaigns,
      messagesSent: totalSent,
      messagesFailed: totalFailed,
      messagesSkipped: totalSkipped,
      readRate,
      responseRate,
    })
  } catch (error) {
    console.error("[Campaigns Stats] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
