import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { isDemoMode, sql } from "@/lib/db"

export const runtime = "nodejs"

type Db = NonNullable<typeof sql>

async function getMessagesColumns(db: Db): Promise<Set<string>> {
  try {
    const rows: any[] = await db`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'messages'
        AND column_name IN ('metadata', 'direction', 'sender_type', 'created_at')
      ORDER BY column_name
    `
    return new Set((rows || []).map((r) => String(r?.column_name || "").trim()).filter(Boolean))
  } catch {
    return new Set()
  }
}

export async function GET(request: Request) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    if (isDemoMode) {
      return NextResponse.json({ error: "Not available in demo mode" }, { status: 400 })
    }

    if (!sql) {
      return NextResponse.json(
        { error: "DATABASE_URL missing" },
        { status: 500 },
      )
    }

    const { searchParams } = new URL(request.url)
    const campaignId = String(searchParams.get("campaignId") || "").trim() || null

    const db = sql
    const cols = await getMessagesColumns(db)

    if (!cols.has("metadata")) {
      return NextResponse.json(
        {
          error: "messages.metadata column not found",
          hint: "Necesitas la migración que agrega metadata para tracking de campañas.",
        },
        { status: 500 },
      )
    }

    // Outbound messages detection varies by schema/version.
    // If `direction` exists but isn't being populated, fall back to sender_type='agent'.
    const hasDirection = cols.has("direction")
    const hasSenderType = cols.has("sender_type")

    const whereOutbound = hasDirection
      ? hasSenderType
        ? db`(direction = 'outbound' OR (direction IS NULL AND sender_type = 'agent'))`
        : db`direction = 'outbound'`
      : hasSenderType
        ? db`sender_type = 'agent'`
        : db`1 = 1`

    const whereCampaign = campaignId ? db`AND (metadata->>'campaignId') = ${campaignId}` : db``

    const rows: any[] = await db`
      SELECT
        COALESCE(NULLIF(metadata->>'whatsappStatus', ''), 'pending') AS status,
        COUNT(*)::int AS count
      FROM messages
      WHERE ${whereOutbound}
        AND COALESCE((metadata->>'source'), '') = 'bulk'
        ${whereCampaign}
      GROUP BY 1
      ORDER BY 2 DESC
    `

    const statusCounts: Record<string, number> = {}
    for (const r of rows || []) {
      const status = String(r?.status || "pending")
      const count = Number(r?.count || 0)
      statusCounts[status] = count
    }

    // Pull a small sample of recent messages (and any whatsappError) to debug delivery.
    const sample: any[] = await db`
      SELECT
        id,
        conversation_id,
        created_at,
        metadata->>'whatsappStatus' AS whatsapp_status,
        metadata->>'whatsappError' AS whatsapp_error,
        metadata->'send'->>'externalMessageId' AS external_message_id
      FROM messages
      WHERE ${whereOutbound}
        AND COALESCE((metadata->>'source'), '') = 'bulk'
        ${whereCampaign}
      ORDER BY created_at DESC
      LIMIT 20
    `

    // Extra debug: if empty, show recent outbound messages and their metadata tags.
    const isEmpty = Object.keys(statusCounts).length === 0 && (!sample || sample.length === 0)
    let debug: any = null
    if (isEmpty) {
      const recentOutbound: any[] = await db`
        SELECT
          id,
          created_at,
          sender_type,
          COALESCE(direction::text, NULL) AS direction,
          COALESCE(metadata->>'source', NULL) AS source,
          COALESCE(metadata->>'campaignId', NULL) AS campaign_id,
          COALESCE(metadata->'send'->>'to', NULL) AS send_to,
          COALESCE(metadata->'send'->>'externalMessageId', NULL) AS external_message_id
        FROM messages
        WHERE ${whereOutbound}
        ORDER BY created_at DESC
        LIMIT 25
      `

      debug = {
        campaignId,
        hasDirection,
        hasSenderType,
        note: "No se encontraron filas con metadata.source='bulk'. Revisa si el envío masivo está insertando metadata o si está apuntando a otra BD.",
        recentOutbound,
      }
    }

    return NextResponse.json({ campaignId, statusCounts, sample, debug })
  } catch (error) {
    console.error("[Campaign Delivery] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
