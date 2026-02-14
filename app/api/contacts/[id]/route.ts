import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { isDemoMode, sql } from "@/lib/db"

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

function normalizeRole(role: string | undefined | null): "admin" | "supervisor" | "agent" | "other" {
  const r = String(role || "").trim()
  const roleMap: Record<string, "admin" | "supervisor" | "agent"> = {
    Administrador: "admin",
    Supervisor: "supervisor",
    Agente: "agent",
    admin: "admin",
    supervisor: "supervisor",
    agent: "agent",
  }
  return roleMap[r] || "other"
}

function normalizePhoneToDigits(value: string) {
  const digits = String(value || "").replace(/^whatsapp:/i, "").replace(/\D/g, "")
  if (!digits) return ""
  if (digits.startsWith("521") && digits.length === 13) return `52${digits.slice(-10)}`
  if (digits.length === 10) return `52${digits}`
  return digits
}

async function loadContactByIdText(id: string) {
  const rows: any[] = await sql!`
    SELECT *
    FROM contacts
    WHERE id::text = ${id}
    LIMIT 1
  `
  return rows?.[0] || null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const role = normalizeRole((user as any).role)
    if (role !== "admin" && role !== "supervisor") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { id } = await params
    const idText = String(id || "").trim()
    if (!idText) return NextResponse.json({ error: "Contact ID required" }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const name = String(body?.name ?? "").trim()
    const phoneRaw = String(body?.phone_number ?? "").trim()
    const externalRaw = String(body?.external_user_id ?? "").trim()

    if (isDemoMode) {
      return NextResponse.json(
        { ok: true, demo: true },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      )
    }

    const includeChannelCols = await hasContactChannelColumns()

    const contact = await loadContactByIdText(idText)
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 })

    const channel = includeChannelCols ? String(contact?.channel || "whatsapp").toLowerCase() : "whatsapp"

    let phone_number = phoneRaw
    let external_user_id = externalRaw

    if (channel === "whatsapp") {
      // If user provided phone/external, normalize to whatsapp:+digits
      const digits = normalizePhoneToDigits(phone_number || external_user_id)
      if (digits) {
        phone_number = `whatsapp:+${digits}`
        if (includeChannelCols) external_user_id = digits
      } else {
        phone_number = ""
        external_user_id = ""
      }
    } else {
      // Facebook: keep phone as-is; if external provided and phone empty, derive a placeholder
      if (external_user_id && !phone_number) {
        phone_number = `fb_${external_user_id}`
      }
    }

    const updated = includeChannelCols
      ? await sql!`
          UPDATE contacts
          SET name = COALESCE(NULLIF(${name}, ''), name),
              phone_number = COALESCE(NULLIF(${phone_number}, ''), phone_number),
              external_user_id = COALESCE(NULLIF(${external_user_id}, ''), external_user_id)
          WHERE id = ${contact.id}
          RETURNING id, name, phone_number, avatar_url, channel, external_user_id, created_at
        `
      : await sql!`
          UPDATE contacts
          SET name = COALESCE(NULLIF(${name}, ''), name),
              phone_number = COALESCE(NULLIF(${phone_number}, ''), phone_number)
          WHERE id = ${contact.id}
          RETURNING id, name, phone_number, avatar_url, NULL::varchar as channel, NULL::varchar as external_user_id, created_at
        `

    return NextResponse.json(
      { contact: updated?.[0] || null },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    )
  } catch (error) {
    console.error("[Contacts PATCH] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const role = normalizeRole((user as any).role)
    if (role !== "admin" && role !== "supervisor") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { id } = await params
    const idText = String(id || "").trim()
    if (!idText) return NextResponse.json({ error: "Contact ID required" }, { status: 400 })

    if (isDemoMode) {
      return NextResponse.json(
        { ok: true, deleted: idText, demo: true },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      )
    }

    const deleted = await sql.begin(async (tx) => {
      // Load contact (by id::text) using tx
      const rows: any[] = await (tx as any)`
        SELECT *
        FROM contacts
        WHERE id::text = ${idText}
        LIMIT 1
      `
      const contact = rows?.[0]
      if (!contact) return null

      // Best-effort cleanup for deployments without ON DELETE CASCADE
      try {
        const convs: any[] = await (tx as any)`
          SELECT id
          FROM conversations
          WHERE contact_id = ${contact.id}
        `
        const convIds = (convs || []).map((c) => c.id)

        for (const convId of convIds) {
          try {
            await (tx as any)`DELETE FROM conversation_tags WHERE conversation_id = ${convId}`
          } catch {
            // ignore
          }
          try {
            await (tx as any)`DELETE FROM messages WHERE conversation_id = ${convId}`
          } catch {
            // ignore
          }
        }

        try {
          await (tx as any)`DELETE FROM conversations WHERE contact_id = ${contact.id}`
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }

      // Finally delete contact
      await (tx as any)`DELETE FROM contacts WHERE id = ${contact.id}`
      return contact.id
    })

    if (!deleted) return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    return NextResponse.json(
      { ok: true, deleted },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    )
  } catch (error: any) {
    console.error("[Contacts DELETE] Error:", error)

    const msg = String(error?.message || "")
    // FK violations or similar
    if (String(error?.code || "") === "23503" || msg.toLowerCase().includes("foreign key")) {
      return NextResponse.json({ error: "No se puede eliminar el contacto porque tiene datos relacionados." }, { status: 409 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
