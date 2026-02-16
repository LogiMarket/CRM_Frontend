import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { isDemoMode, sql } from "@/lib/db"

export const runtime = "nodejs"

type Db = NonNullable<typeof sql>

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

function safeInt(value: string | null, fallback: number) {
  const n = value == null ? NaN : Number.parseInt(String(value), 10)
  return Number.isFinite(n) ? n : fallback
}

export async function GET(request: Request) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    if (isDemoMode) {
      return NextResponse.json({ error: "Not available in demo mode" }, { status: 400 })
    }

    if (!sql) {
      return NextResponse.json({ error: "DATABASE_URL missing" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(200, Math.max(1, safeInt(searchParams.get("limit"), 50)))
    const channelRaw = String(searchParams.get("channel") || "whatsapp").trim() || "whatsapp"
    const channel = ["whatsapp", "whatsapp_invalid_signature", "whatsapp_verify"].includes(channelRaw)
      ? channelRaw
      : "whatsapp"

    const db = sql
    await ensureWebhookLogsTable(db)

    const rows: any[] = await db`
      SELECT id, external_id, processed, error, created_at, payload
      FROM webhook_logs
      WHERE channel = ${channel}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    const mapped = (rows || []).map((r) => {
      const payload = r?.payload || {}
      const entry0 = payload?.entry?.[0]
      const changes0 = entry0?.changes?.[0]
      const value = changes0?.value
      const statusesCount = Array.isArray(value?.statuses) ? value.statuses.length : 0
      const messagesCount = Array.isArray(value?.messages) ? value.messages.length : 0

      return {
        id: Number(r?.id),
        createdAt: r?.created_at,
        externalId: String(r?.external_id || ""),
        processed: Boolean(r?.processed),
        error: r?.error ? String(r.error) : null,
        counts: {
          statuses: statusesCount,
          messages: messagesCount,
        },
      }
    })

    const summary = mapped.reduce(
      (acc, x) => {
        acc.total += 1
        acc.withStatuses += x.counts.statuses > 0 ? 1 : 0
        acc.withMessages += x.counts.messages > 0 ? 1 : 0
        acc.errors += x.error ? 1 : 0
        acc.unprocessed += x.processed ? 0 : 1
        return acc
      },
      { total: 0, withStatuses: 0, withMessages: 0, errors: 0, unprocessed: 0 },
    )

    return NextResponse.json({ channel, summary, logs: mapped })
  } catch (error) {
    console.error("[WhatsApp Webhook Logs] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
