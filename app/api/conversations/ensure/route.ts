import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { isDemoMode, sql } from "@/lib/db"
import { DEMO_CONVERSATIONS } from "@/lib/demo-data"

let _hasConversationChannelColumns: boolean | null = null
let _hasConversationExternalConversationIdColumn: boolean | null = null

async function hasConversationChannelColumns(): Promise<boolean> {
  if (_hasConversationChannelColumns !== null) return _hasConversationChannelColumns
  try {
    const rows = await sql!`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'conversations'
        AND column_name IN ('channel', 'external_user_id')
      ORDER BY column_name
    `
    _hasConversationChannelColumns = Array.isArray(rows) && rows.length === 2
  } catch {
    _hasConversationChannelColumns = false
  }
  return _hasConversationChannelColumns
}

async function hasConversationExternalConversationIdColumn(): Promise<boolean> {
  if (_hasConversationExternalConversationIdColumn !== null) return _hasConversationExternalConversationIdColumn
  try {
    const rows = await sql!`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'conversations'
        AND column_name = 'external_conversation_id'
      LIMIT 1
    `
    _hasConversationExternalConversationIdColumn = Array.isArray(rows) && rows.length > 0
  } catch {
    _hasConversationExternalConversationIdColumn = false
  }
  return _hasConversationExternalConversationIdColumn
}

export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const contactIdRaw = body?.contactId ?? body?.contact_id
    const contactId = contactIdRaw !== undefined && contactIdRaw !== null ? Number(contactIdRaw) : NaN

    if (!contactId || Number.isNaN(contactId)) {
      return NextResponse.json({ error: "contactId is required" }, { status: 400 })
    }

    if (isDemoMode) {
      const existing = DEMO_CONVERSATIONS.find((c) => c.contact_id === contactId && c.status !== "closed")
      if (!existing) {
        return NextResponse.json({
          conversation: { id: Date.now(), contact_id: contactId, status: "open", priority: "medium" },
          contact: { id: contactId },
          demo: true,
        })
      }
      return NextResponse.json({
        conversation: { id: existing.id, contact_id: existing.contact_id, status: existing.status, priority: existing.priority, channel: "whatsapp" },
        contact: { id: existing.contact_id, name: existing.contact.name, phone_number: existing.contact.phone_number, channel: "whatsapp" },
        demo: true,
      })
    }

    // Load contact
    const contactRows: any[] = await sql!`
      SELECT *
      FROM contacts
      WHERE id = ${contactId}
      LIMIT 1
    `

    if (!contactRows.length) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    const contact = contactRows[0]

    // Find latest open/assigned conversation
    let conversationRows: any[] = []
    try {
      conversationRows = await sql!`
        SELECT *
        FROM conversations
        WHERE contact_id = ${contactId}
          AND status IN ('open', 'assigned')
        ORDER BY created_at DESC
        LIMIT 1
      `
    } catch {
      conversationRows = []
    }

    const includeChannelCols = await hasConversationChannelColumns()
    const includeExternalConvId = await hasConversationExternalConversationIdColumn()

    if (!conversationRows.length) {
      const channel = (String(contact?.channel || "whatsapp").toLowerCase() === "facebook") ? "facebook" : "whatsapp"
      const externalUserId = String(contact?.external_user_id || "").trim() || null

      // Insert conversation (compatible with schemas missing channel columns)
      if (includeChannelCols && includeExternalConvId) {
        conversationRows = await sql!`
          INSERT INTO conversations (
            contact_id,
            status,
            priority,
            channel,
            external_user_id,
            external_conversation_id,
            created_at,
            updated_at,
            last_message_at
          )
          VALUES (
            ${contactId},
            'open',
            'medium',
            ${channel},
            ${externalUserId},
            ${externalUserId ? `${channel}_${externalUserId}` : null},
            NOW(),
            NOW(),
            NOW()
          )
          RETURNING *
        `
      } else if (includeChannelCols) {
        conversationRows = await sql!`
          INSERT INTO conversations (
            contact_id,
            status,
            priority,
            channel,
            external_user_id,
            created_at,
            updated_at,
            last_message_at
          )
          VALUES (
            ${contactId},
            'open',
            'medium',
            ${channel},
            ${externalUserId},
            NOW(),
            NOW(),
            NOW()
          )
          RETURNING *
        `
      } else {
        conversationRows = await sql!`
          INSERT INTO conversations (
            contact_id,
            status,
            priority,
            created_at,
            updated_at,
            last_message_at
          )
          VALUES (
            ${contactId},
            'open',
            'medium',
            NOW(),
            NOW(),
            NOW()
          )
          RETURNING *
        `
      }
    }

    const conversation = conversationRows[0]

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        contact_id: conversation.contact_id,
        status: conversation.status,
        priority: conversation.priority,
        channel: (conversation as any).channel || (contact as any).channel || "whatsapp",
        external_user_id: (conversation as any).external_user_id || (contact as any).external_user_id || null,
      },
      contact: {
        id: contact.id,
        name: contact.name,
        phone_number: contact.phone_number,
        channel: (contact as any).channel || "whatsapp",
        external_user_id: (contact as any).external_user_id || null,
      },
    })
  } catch (error) {
    console.error("[Conversations Ensure] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
