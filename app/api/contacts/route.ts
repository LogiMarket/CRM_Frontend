import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { isDemoMode, sql } from "@/lib/db"
import { DEMO_CONTACTS } from "@/lib/demo-data"

let _hasContactChannelColumns: boolean | null = null

async function hasContactChannelColumns(): Promise<boolean> {
  if (_hasContactChannelColumns !== null) return _hasContactChannelColumns
  try {
    const rows = await sql!`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'contacts'
        AND column_name IN ('channel', 'external_user_id')
      ORDER BY column_name
    `
    _hasContactChannelColumns = Array.isArray(rows) && rows.length === 2
  } catch {
    _hasContactChannelColumns = false
  }
  return _hasContactChannelColumns
}

function normalizePhoneToDigits(value: string) {
  const digits = String(value || "").replace(/^whatsapp:/i, "").replace(/\D/g, "")
  if (!digits) return ""
  if (digits.startsWith("521") && digits.length === 13) return `52${digits.slice(-10)}`
  if (digits.length === 10) return `52${digits}`
  return digits
}

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    if (isDemoMode) {
      return NextResponse.json(
        { contacts: DEMO_CONTACTS },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      )
    }

    const includeChannelCols = await hasContactChannelColumns()

    const rows = includeChannelCols
      ? await sql!`
          SELECT id, name, phone_number, avatar_url, channel, external_user_id, created_at
          FROM contacts
          ORDER BY created_at DESC
          LIMIT 200
        `
      : await sql!`
          SELECT id, name, phone_number, avatar_url, NULL::varchar as channel, NULL::varchar as external_user_id, created_at
          FROM contacts
          ORDER BY created_at DESC
          LIMIT 200
        `

    return NextResponse.json(
      { contacts: rows || [] },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    )
  } catch (error) {
    console.error("[Contacts GET] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const rawName = String(body?.name || "").trim()
    const rawChannel = String(body?.channel || "whatsapp").trim().toLowerCase()

    const channel = rawChannel === "facebook" ? "facebook" : "whatsapp"

    let name = rawName
    let phone_number = String(body?.phone_number || "").trim()
    let external_user_id = String(body?.external_user_id || "").trim()

    if (channel === "whatsapp") {
      const digits = normalizePhoneToDigits(phone_number || external_user_id)
      if (!digits) {
        return NextResponse.json({ error: "phone_number is required" }, { status: 400 })
      }
      phone_number = `whatsapp:+${digits}`
      external_user_id = digits
      if (!name) name = `+${digits}`
    } else {
      // Facebook: require external_user_id (PSID)
      if (!external_user_id) {
        return NextResponse.json({ error: "external_user_id is required for facebook" }, { status: 400 })
      }
      if (!phone_number) phone_number = `fb_${external_user_id}`
      if (!name) name = `Facebook User ${external_user_id.slice(-8)}`
    }

    if (isDemoMode) {
      return NextResponse.json({
        contact: {
          id: Date.now(),
          name,
          phone_number,
          avatar_url: null,
          channel,
          external_user_id,
          created_at: new Date().toISOString(),
        },
        demo: true,
      })
    }

    const includeChannelCols = await hasContactChannelColumns()

    // Upsert-ish behavior: if phone exists, update name/channel fields
    let existing: any[] = []
    try {
      existing = await sql!`SELECT id, name, phone_number FROM contacts WHERE phone_number = ${phone_number} LIMIT 1`
    } catch {
      existing = []
    }

    if (existing.length) {
      const updated = includeChannelCols
        ? await sql!`
            UPDATE contacts
            SET name = COALESCE(NULLIF(${name}, ''), name),
                channel = COALESCE(NULLIF(${channel}, ''), channel),
                external_user_id = COALESCE(NULLIF(${external_user_id}, ''), external_user_id)
            WHERE id = ${existing[0].id}
            RETURNING id, name, phone_number, avatar_url, channel, external_user_id, created_at
          `
        : await sql!`
            UPDATE contacts
            SET name = COALESCE(NULLIF(${name}, ''), name)
            WHERE id = ${existing[0].id}
            RETURNING id, name, phone_number, avatar_url, NULL::varchar as channel, NULL::varchar as external_user_id, created_at
          `

      return NextResponse.json({ contact: updated[0], updated: true })
    }

    const inserted = includeChannelCols
      ? await sql!`
          INSERT INTO contacts (name, phone_number, channel, external_user_id, created_at)
          VALUES (${name}, ${phone_number}, ${channel}, ${external_user_id}, NOW())
          RETURNING id, name, phone_number, avatar_url, channel, external_user_id, created_at
        `
      : await sql!`
          INSERT INTO contacts (name, phone_number, created_at)
          VALUES (${name}, ${phone_number}, NOW())
          RETURNING id, name, phone_number, avatar_url, NULL::varchar as channel, NULL::varchar as external_user_id, created_at
        `

    return NextResponse.json({ contact: inserted[0] })
  } catch (error) {
    console.error("[Contacts POST] Error:", error)
    const msg = String((error as any)?.message || "")
    const isUnique = msg.toLowerCase().includes("unique")
    return NextResponse.json({ error: isUnique ? "Contact already exists" : "Internal server error" }, { status: isUnique ? 409 : 500 })
  }
}
