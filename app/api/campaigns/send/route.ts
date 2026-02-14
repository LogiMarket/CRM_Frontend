import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { isDemoMode, sql } from "@/lib/db"

export const runtime = "nodejs"

type Db = NonNullable<typeof sql>

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""))
}

function normalizeWhatsappToDigits(value: string) {
  return String(value || "").replace(/^whatsapp:/i, "").replace(/\D/g, "")
}

type WhatsappTemplateSpec = {
  name: string
  language: string
  bodyParams?: string[]
}

type SendMode = "auto" | "text" | "template"

function renderMessageTemplate(template: string, contact: any) {
  const name = String(contact?.name || "").trim()
  const phone = String(contact?.phone_number || "").trim()
  const externalUserId = String(contact?.external_user_id || "").trim()
  const id = String(contact?.id || "").trim()

  // Common variables used in UI templates
  return String(template || "")
    .replace(/\{\{\s*nombre\s*\}\}/gi, name || "")
    .replace(/\{\{\s*telefono\s*\}\}/gi, phone || "")
    .replace(/\{\{\s*phone_number\s*\}\}/gi, phone || "")
    .replace(/\{\{\s*external_user_id\s*\}\}/gi, externalUserId || "")
    .replace(/\{\{\s*id\s*\}\}/gi, id || "")
}

let _hasConversationChannelColumns: boolean | null = null
let _hasConversationExternalConversationIdColumn: boolean | null = null
let _conversationStatusOpenValue: string | null = null
let _conversationStatusClosedValue: string | null = null
let _hasMessagesExtendedCols: boolean | null = null

async function hasConversationChannelColumns(db: Db): Promise<boolean> {
  if (_hasConversationChannelColumns !== null) return _hasConversationChannelColumns
  try {
    const rows = await db`
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

async function hasConversationExternalConversationIdColumn(db: Db): Promise<boolean> {
  if (_hasConversationExternalConversationIdColumn !== null) return _hasConversationExternalConversationIdColumn
  try {
    const rows = await db`
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

async function hasMessagesExtendedCols(db: Db): Promise<boolean> {
  if (_hasMessagesExtendedCols !== null) return _hasMessagesExtendedCols
  try {
    const rows = await db`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'messages'
        AND column_name IN ('channel', 'external_message_id', 'direction')
      ORDER BY column_name
    `
    _hasMessagesExtendedCols = Array.isArray(rows) && rows.length === 3
  } catch {
    _hasMessagesExtendedCols = false
  }
  return _hasMessagesExtendedCols
}

async function getConversationStatusValues(db: Db): Promise<{ openValue: string; closedValue: string | null }> {
  if (_conversationStatusOpenValue !== null) {
    return { openValue: _conversationStatusOpenValue, closedValue: _conversationStatusClosedValue }
  }

  let openValue = "open"
  let closedValue: string | null = "closed"

  try {
    const cols: any[] = await db`
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'conversations'
        AND column_name = 'status'
      LIMIT 1
    `

    const dataType = String(cols?.[0]?.data_type || "")
    const udtName = String(cols?.[0]?.udt_name || "")

    if (dataType.toUpperCase() === "USER-DEFINED" && udtName) {
      const labels: any[] = await db`
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = ${udtName}
        ORDER BY e.enumsortorder
      `
      const enumLabels = (labels || []).map((r) => String(r.enumlabel))

      const pickFirst = (candidates: string[]) => enumLabels.find((l) => candidates.includes(l))
      openValue = pickFirst(["open", "active", "new", "pending"]) || enumLabels[0] || openValue
      closedValue = pickFirst(["closed", "resolved", "archived"]) || null
    }
  } catch {
    // keep defaults
  }

  _conversationStatusOpenValue = openValue
  _conversationStatusClosedValue = closedValue
  return { openValue, closedValue }
}

async function ensureConversationForContact(db: Db, contactIdText: string) {
  const contactRows: any[] = await db`
    SELECT *
    FROM contacts
    WHERE id::text = ${contactIdText}
    LIMIT 1
  `
  if (!contactRows.length) {
    return { ok: false as const, error: "Contact not found" as const }
  }

  const contact = contactRows[0]
  const { openValue: statusOpenValue, closedValue: statusClosedValue } = await getConversationStatusValues(db)

  let conversationRows: any[] = []
  try {
    conversationRows = statusClosedValue
      ? await db`
          SELECT *
          FROM conversations
          WHERE contact_id = ${contact.id}
            AND status::text != ${statusClosedValue}
          ORDER BY created_at DESC
          LIMIT 1
        `
      : await db`
          SELECT *
          FROM conversations
          WHERE contact_id = ${contact.id}
          ORDER BY created_at DESC
          LIMIT 1
        `
  } catch {
    conversationRows = []
  }

  const includeChannelCols = await hasConversationChannelColumns(db)
  const includeExternalConvId = await hasConversationExternalConversationIdColumn(db)

  if (!conversationRows.length) {
    const channel = String((contact as any)?.channel || "whatsapp").toLowerCase() === "facebook" ? "facebook" : "whatsapp"
    const externalUserId = String((contact as any)?.external_user_id || "").trim() || null

    if (includeChannelCols && includeExternalConvId) {
      conversationRows = await db`
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
          ${contact.id},
          ${statusOpenValue},
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
      conversationRows = await db`
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
          ${contact.id},
          ${statusOpenValue},
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
      conversationRows = await db`
        INSERT INTO conversations (
          contact_id,
          status,
          priority,
          created_at,
          updated_at,
          last_message_at
        )
        VALUES (
          ${contact.id},
          ${statusOpenValue},
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

  return {
    ok: true as const,
    contact,
    conversation,
    channel: String((conversation as any)?.channel || (contact as any)?.channel || "whatsapp").toLowerCase(),
    externalUserId: String((conversation as any)?.external_user_id || (contact as any)?.external_user_id || "").trim() || null,
  }
}

async function sendWhatsappText(message: string, phoneNumberRaw: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!accessToken || !phoneNumberId) {
    return { ok: false as const, error: "WHATSAPP credentials missing" }
  }

  const to = normalizeWhatsappToDigits(phoneNumberRaw)
  if (!to) {
    return { ok: false as const, error: "Recipient phone missing" }
  }

  const response = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    return { ok: false as const, error: data?.error?.message || "Failed to send WhatsApp message", details: data }
  }

  const externalMessageId = String(data?.messages?.[0]?.id || "") || null
  return { ok: true as const, externalMessageId, data }
}

async function sendWhatsappTemplate(template: WhatsappTemplateSpec, phoneNumberRaw: string, renderedBodyParams: string[]) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!accessToken || !phoneNumberId) {
    return { ok: false as const, error: "WHATSAPP credentials missing" }
  }

  const to = normalizeWhatsappToDigits(phoneNumberRaw)
  if (!to) {
    return { ok: false as const, error: "Recipient phone missing" }
  }

  const name = String(template?.name || "").trim()
  const language = String(template?.language || "").trim()
  if (!name || !language) {
    return { ok: false as const, error: "Template name/language missing" }
  }

  const response = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name,
        language: { code: language },
        components: [
          {
            type: "body",
            parameters: (renderedBodyParams || []).map((text) => ({ type: "text", text: String(text ?? "") })),
          },
        ],
      },
    }),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    return { ok: false as const, error: data?.error?.message || "Failed to send WhatsApp template", details: data }
  }

  const externalMessageId = String(data?.messages?.[0]?.id || "") || null
  return { ok: true as const, externalMessageId, data }
}

async function sendFacebookText(message: string, recipientId: string) {
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!accessToken) {
    return { ok: false as const, error: "FACEBOOK_PAGE_ACCESS_TOKEN missing" }
  }

  const response = await fetch("https://graph.facebook.com/v18.0/me/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
      access_token: accessToken,
      messaging_type: "RESPONSE",
    }),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    return { ok: false as const, error: data?.error?.message || "Failed to send Facebook message", details: data }
  }

  return { ok: true as const, externalMessageId: String(data?.message_id || "") || null, data }
}

async function insertOutboundMessage(db: Db, opts: { conversationId: string; userId: string | number; content: string }) {
  const { conversationId, userId, content } = opts

  let messageRow: any = null
  try {
    // try UUID insert
    const result = await db`
      INSERT INTO messages (conversation_id, sender_type, sender_id, content)
      VALUES (${conversationId}::uuid, 'agent', ${userId}, ${content})
      RETURNING id
    `
    messageRow = result?.[0] || null
  } catch {
    // fallback to number insert
    try {
      const asNumber = Number.parseInt(conversationId)
      const result = await db`
        INSERT INTO messages (conversation_id, sender_type, sender_id, content)
        VALUES (${asNumber}, 'agent', ${userId}, ${content})
        RETURNING id
      `
      messageRow = result?.[0] || null
    } catch {
      // final fallback: insert without casting
      const result = await db`
        INSERT INTO messages (conversation_id, sender_type, sender_id, content)
        VALUES (${conversationId}, 'agent', ${userId}, ${content})
        RETURNING id
      `
      messageRow = result?.[0] || null
    }
  }

  // Update conversation last_message_at - best effort
  try {
    await db`
      UPDATE conversations
      SET last_message_at = NOW(), updated_at = NOW()
      WHERE id::text = ${conversationId}
    `
  } catch {
    // ignore
  }

  return messageRow
}

async function getLastInboundAt(db: Db, conversationId: string, hasExtendedDirection: boolean) {
  try {
    if (hasExtendedDirection) {
      const rows: any[] = await db`
        SELECT MAX(created_at) AS last_inbound_at
        FROM messages
        WHERE conversation_id::text = ${conversationId}
          AND direction = 'inbound'
      `
      const v = rows?.[0]?.last_inbound_at
      return v ? new Date(v) : null
    }

    // Fallback for older schemas: infer inbound as non-agent sender
    const rows: any[] = await db`
      SELECT MAX(created_at) AS last_inbound_at
      FROM messages
      WHERE conversation_id::text = ${conversationId}
        AND sender_type != 'agent'
    `
    const v = rows?.[0]?.last_inbound_at
    return v ? new Date(v) : null
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
          hint: "Configura DATABASE_URL para poder leer contactos y crear mensajes/conversaciones.",
        },
        { status: 500 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const contactIds = Array.isArray(body?.contactIds) ? body.contactIds.map((x: any) => String(x).trim()).filter(Boolean) : []
    const messageTemplate = String(body?.message || "").trim()

    const sendMode: SendMode = (String(body?.sendMode || "auto") as SendMode)
    const skipIfOutside24h =
      typeof body?.skipIfOutside24h === "boolean" ? Boolean(body.skipIfOutside24h) : sendMode === "text"

    const whatsappTemplate: WhatsappTemplateSpec | null = body?.whatsappTemplate
      ? {
          name: String(body.whatsappTemplate?.name || "").trim(),
          language: String(body.whatsappTemplate?.language || "").trim(),
          bodyParams: Array.isArray(body.whatsappTemplate?.bodyParams)
            ? body.whatsappTemplate.bodyParams.map((x: any) => String(x ?? "")).filter((x: string) => x.trim().length > 0)
            : [],
        }
      : null

    if (!contactIds.length) {
      return NextResponse.json({ error: "contactIds is required" }, { status: 400 })
    }
    if (!messageTemplate) {
      return NextResponse.json({ error: "message is required" }, { status: 400 })
    }

    const db = sql
    const includeMessagesExtended = await hasMessagesExtendedCols(db)

    const results: Array<any> = []

    // Sequential send to avoid rate limits
    for (const contactIdText of contactIds) {
      try {
        const ensured = await ensureConversationForContact(db, contactIdText)
        if (!ensured.ok) {
          results.push({ contactId: contactIdText, ok: false, error: ensured.error })
          continue
        }

        const conversationId = String(ensured.conversation.id)
        const channel = ensured.channel === "facebook" ? "facebook" : "whatsapp"

        const renderedContent = renderMessageTemplate(messageTemplate, ensured.contact)

        const shouldSendWhatsappTemplate =
          sendMode !== "text" &&
          channel === "whatsapp" &&
          !!whatsappTemplate &&
          !!whatsappTemplate.name &&
          !!whatsappTemplate.language

        const shouldSendWhatsappText = channel === "whatsapp" && (sendMode === "text" || !shouldSendWhatsappTemplate)

        let sendRes:
          | { ok: true; externalMessageId: string | null }
          | { ok: false; error: string; details?: any }

        if (channel === "facebook") {
          const recipientId = String(ensured.externalUserId || "").trim()
          if (!recipientId) {
            results.push({ contactId: contactIdText, conversationId, channel, ok: false, error: "external_user_id (PSID) missing" })
            continue
          }
          sendRes = await sendFacebookText(renderedContent, recipientId)
        } else {
          const phoneNumber = String((ensured.contact as any)?.phone_number || "").trim()

          if (shouldSendWhatsappText && skipIfOutside24h) {
            const lastInboundAt = await getLastInboundAt(db, conversationId, includeMessagesExtended)
            const msSinceInbound = lastInboundAt ? Date.now() - lastInboundAt.getTime() : Number.POSITIVE_INFINITY
            const within24h = msSinceInbound >= 0 && msSinceInbound <= 24 * 60 * 60 * 1000
            if (!within24h) {
              results.push({
                contactId: contactIdText,
                conversationId,
                channel,
                sendType: "text",
                ok: false,
                skipped: true,
                error: "Fuera de ventana 24h: WhatsApp requiere una plantilla (template) aprobada para este envío",
              })
              continue
            }
          }

          if (shouldSendWhatsappTemplate) {
            const renderedBodyParams = (whatsappTemplate?.bodyParams || []).map((p) => renderMessageTemplate(p, ensured.contact))
            sendRes = await sendWhatsappTemplate(whatsappTemplate!, phoneNumber, renderedBodyParams)
          } else {
            sendRes = await sendWhatsappText(renderedContent, phoneNumber)
          }
        }

        // Save message in DB regardless of send result (so UI shows what was attempted)
        const inserted = await insertOutboundMessage(db, {
          conversationId,
          userId: (user as any).id,
          content: renderedContent,
        })

        // Best-effort update extended cols with channel/external id
        if (includeMessagesExtended && inserted?.id && sendRes.ok) {
          try {
            await db`
              UPDATE messages
              SET channel = ${channel},
                  external_message_id = ${sendRes.externalMessageId},
                  direction = 'outbound'
              WHERE id = ${inserted.id}
            `
          } catch {
            // ignore
          }
        }

        results.push({
          contactId: contactIdText,
          conversationId,
          channel,
          sendType: channel === "whatsapp" && shouldSendWhatsappTemplate ? "template" : "text",
          ok: sendRes.ok,
          error:
            sendRes.ok
              ? null
              : /24\s*hour|24\s*h|outside\s+the\s+allowed\s+window|outside\s+customer\s+care/i.test(String(sendRes.error || ""))
                ? `${sendRes.error} (probable ventana 24h; usa plantilla aprobada)`
                : sendRes.error,
        })
      } catch (e) {
        results.push({ contactId: contactIdText, ok: false, error: e instanceof Error ? e.message : "Unexpected error" })
      }
    }

    const total = results.length
    const sent = results.filter((r) => r.ok).length
    const failed = total - sent
    const skipped = results.filter((r) => r?.skipped).length

    return NextResponse.json({
      total,
      sent,
      failed,
      skipped,
      results,
    })
  } catch (error) {
    console.error("[Campaigns Send] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
