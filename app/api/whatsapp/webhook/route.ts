import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import crypto from "crypto"

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

let _hasMessagesReadAtColumn: boolean | null = null
let _hasMessagesExternalMessageIdColumn: boolean | null = null

async function hasMessagesReadAtColumn(): Promise<boolean> {
  if (_hasMessagesReadAtColumn !== null) return _hasMessagesReadAtColumn
  try {
    const rows: any[] = await sql!`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'messages'
        AND column_name = 'read_at'
      LIMIT 1
    `
    _hasMessagesReadAtColumn = Array.isArray(rows) && rows.length > 0
  } catch {
    _hasMessagesReadAtColumn = false
  }
  return _hasMessagesReadAtColumn
}

// Webhook verification (GET request from Meta)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get("hub.mode")
    const token = searchParams.get("hub.verify_token")
    const challenge = searchParams.get("hub.challenge")

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

    console.log("[WhatsApp Webhook] Verification request:", { mode, token })

    // Best-effort persist verification attempts so we can confirm Meta is reaching prod.
    try {
      if (sql) {
        await ensureWebhookLogsTable(sql)
        await sql!`
          INSERT INTO webhook_logs (channel, external_id, payload, processed, error)
          VALUES (
            'whatsapp_verify',
            'verify',
            ${JSON.stringify({
              receivedAt: new Date().toISOString(),
              mode,
              hasToken: Boolean(token),
              tokenPrefix: token ? String(token).slice(0, 6) : null,
              ok: mode === 'subscribe' && token === verifyToken,
              hasChallenge: Boolean(challenge),
            })}::jsonb,
            true,
            ${mode === 'subscribe' && token === verifyToken ? null : 'Forbidden'}
          )
        `
      }
    } catch (e) {
      console.warn("[WhatsApp Webhook] Failed to persist verification attempt:", e)
    }

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[WhatsApp Webhook] Verification successful")
      return new NextResponse(challenge, { status: 200 })
    }

    console.log("[WhatsApp Webhook] Verification failed")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  } catch (error) {
    console.error("[WhatsApp Webhook] Verification error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// Handle incoming messages (POST request from Meta)
export async function POST(request: Request) {
  try {
    if (!sql) {
      // Acknowledge so Meta doesn't keep retrying; without DB we can't reconcile.
      await request.text().catch(() => "")
      console.warn("[WhatsApp Webhook] DATABASE_URL missing; skipping processing")
      return NextResponse.json({ status: "ok" }, { status: 200 })
    }

    await ensureWebhookLogsTable(sql)

    const rawBody = await request.text()
    const signature = request.headers.get("x-hub-signature-256")

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[WhatsApp Webhook] Invalid signature")

      // Record that Meta is calling us but signature validation fails.
      // This helps distinguish "webhook not configured" vs "configured but rejected".
      try {
        await sql!`
          INSERT INTO webhook_logs (channel, external_id, payload, processed, error)
          VALUES (
            'whatsapp_invalid_signature',
            'invalid_signature',
            ${JSON.stringify({
              receivedAt: new Date().toISOString(),
              hasSignature: Boolean(signature),
              signaturePrefix: signature ? String(signature).slice(0, 16) : null,
            })}::jsonb,
            false,
            'Invalid signature'
          )
        `
      } catch (e) {
        console.warn("[WhatsApp Webhook] Failed to persist invalid signature marker:", e)
      }

      // Optional debug: persist invalid-signature payloads to help diagnose misconfigured app secret.
      if (process.env.DEBUG_WHATSAPP_WEBHOOK === "1") {
        try {
          await sql!`
            INSERT INTO webhook_logs (channel, external_id, payload, processed, error)
            VALUES (
              'whatsapp_invalid_signature',
              'unknown',
              ${JSON.stringify({
                signature: signature || null,
                rawBody,
                receivedAt: new Date().toISOString(),
              })}::jsonb,
              false,
              'Invalid signature'
            )
          `
        } catch (e) {
          console.warn("[WhatsApp Webhook] Failed to persist invalid signature debug payload:", e)
        }
      }

      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    console.log("[WhatsApp Webhook] Received:", JSON.stringify(body, null, 2))

    // Log webhook for debugging
    try {
      await sql!`
        INSERT INTO webhook_logs (channel, external_id, payload, processed)
        VALUES ('whatsapp', ${body.entry?.[0]?.id || "unknown"}, ${JSON.stringify(body)}, false)
      `
    } catch (e) {
      console.warn("[WhatsApp Webhook] Failed to persist webhook log:", e)
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value
        const metadata = value?.metadata
        const phoneNumberId = metadata?.phone_number_id || "unknown"

        // Map of wa_id -> *real* profile name (when Meta provides it)
        const contactsByWaId = new Map<string, string>()
        for (const contact of value?.contacts || []) {
          const waId = contact?.wa_id
          const name = contact?.profile?.name
          if (waId && typeof name === "string" && name.trim()) contactsByWaId.set(waId, name.trim())
        }

        for (const message of value?.messages || []) {
          await handleIncomingMessage(message, phoneNumberId, contactsByWaId)
        }

        // Status updates (delivered/read) for outbound messages
        for (const status of value?.statuses || []) {
          await handleStatusUpdate(status)
        }
      }
    }

    // Mark webhook as processed (best-effort)
    try {
      await sql!`
        UPDATE webhook_logs 
        SET processed = true 
        WHERE channel = 'whatsapp' 
          AND external_id = ${body.entry?.[0]?.id || "unknown"}
          AND created_at >= NOW() - INTERVAL '1 minute'
      `
    } catch (e) {
      console.warn("[WhatsApp Webhook] Failed to mark webhook as processed:", e)
    }

    return NextResponse.json({ status: "ok" }, { status: 200 })
  } catch (error) {
    console.error("[WhatsApp Webhook] Error processing message:", error)

    try {
      await sql!`
        UPDATE webhook_logs 
        SET error = ${error instanceof Error ? error.message : String(error)}, processed = false
        WHERE channel = 'whatsapp' 
          AND created_at >= NOW() - INTERVAL '1 minute'
        ORDER BY created_at DESC
        LIMIT 1
      `
    } catch (logError) {
      console.error("[WhatsApp Webhook] Error logging error:", logError)
    }

    return NextResponse.json({ status: "error" }, { status: 500 })
  }
}

function verifyWebhookSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret) {
    return true
  }

  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false
  }

  const signature = signatureHeader.replace("sha256=", "")
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

async function handleIncomingMessage(
  message: any,
  phoneNumberId: string,
  contactsByWaId: Map<string, string>
) {
  const senderId = message.from
  const messageId = message.id
  const timestamp = message.timestamp ? Number.parseInt(message.timestamp, 10) * 1000 : Date.now()
  const parsed = parseIncomingMessage(message)
  const profileName = contactsByWaId.get(senderId)
  const fallbackName = `whatsapp:+${normalizePhoneNumber(senderId)}`
  const contactName = profileName || fallbackName

  console.log("[WhatsApp] Processing message:", {
    senderId,
    messageText: parsed.content,
    messageId,
    timestamp,
  })

  try {
    // 1. Find or create contact
    let contact = await sql!`
      SELECT * FROM contacts 
      WHERE external_user_id = ${senderId} 
        AND channel = 'whatsapp'
      LIMIT 1
    `

    if (contact.length === 0) {
      const phoneNumber = `whatsapp:+${normalizePhoneNumber(senderId)}`
      contact = await sql!`
        INSERT INTO contacts (
          name, 
          phone_number, 
          channel, 
          external_user_id,
          created_at
        )
        VALUES (
          ${contactName},
          ${phoneNumber},
          'whatsapp',
          ${senderId},
          NOW()
        )
        RETURNING *
      `
    } else {
      // If we now have a real profile name, upgrade any placeholder name.
      if (profileName) {
        const existingName = String((contact as any)[0]?.name || "").trim()
        const existingPhone = String((contact as any)[0]?.phone_number || "").trim()
        const looksLikePhone = existingName && /^(whatsapp:\+|\+?\d{7,})/.test(existingName)
        const looksPlaceholder = !existingName || existingName.toLowerCase().startsWith("whatsapp ") || looksLikePhone || existingName === existingPhone

        if (looksPlaceholder && existingName !== profileName) {
          try {
            contact = await sql!`
              UPDATE contacts
              SET name = ${profileName}
              WHERE id = ${contact[0].id}
              RETURNING *
            `
          } catch (e) {
            console.warn("[WhatsApp] Failed to update contact name:", e)
          }
        }
      }
    }

    const contactId = contact[0].id

    // 2. Find or create conversation
    let conversation = await sql!`
      SELECT * FROM conversations 
      WHERE contact_id = ${contactId} 
        AND channel = 'whatsapp'
        AND status IN ('open', 'assigned')
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (conversation.length === 0) {
      conversation = await sql!`
        INSERT INTO conversations (
          contact_id,
          status,
          priority,
          channel,
          external_user_id,
          external_conversation_id,
          created_at,
          updated_at
        )
        VALUES (
          ${contactId},
          'open',
          'medium',
          'whatsapp',
          ${senderId},
          ${`${phoneNumberId}_${senderId}`},
          NOW(),
          NOW()
        )
        RETURNING *
      `
    }

    const conversationId = conversation[0].id

    // 3. Insert message
    await sql!`
      INSERT INTO messages (
        conversation_id,
        sender_type,
        content,
        channel,
        external_message_id,
        direction,
        message_type,
        metadata,
        created_at
      )
      VALUES (
        ${conversationId},
        'customer',
        ${parsed.content || ""},
        'whatsapp',
        ${messageId},
        'inbound',
        ${parsed.message_type},
        ${parsed.metadata ? JSON.stringify(parsed.metadata) : null}::jsonb,
        ${new Date(timestamp)}
      )
    `

    // 4. Update conversation timestamps
    await sql!`
      UPDATE conversations 
      SET updated_at = NOW(), last_message_at = NOW()
      WHERE id = ${conversationId}
    `

    console.log("[WhatsApp] Message processed successfully")
  } catch (error) {
    console.error("[WhatsApp] Error handling message:", error)
    throw error
  }
}

function parseIncomingMessage(message: any): {
  message_type: string
  content: string
  metadata: any | null
} {
  if (!message) return { message_type: 'text', content: '', metadata: null }

  // Text-like
  if (message.text?.body) {
    return { message_type: 'text', content: message.text.body, metadata: null }
  }
  if (message.button?.text) {
    return { message_type: 'text', content: message.button.text, metadata: { type: 'button' } }
  }
  if (message.interactive?.button_reply?.title) {
    return {
      message_type: 'text',
      content: message.interactive.button_reply.title,
      metadata: { type: 'interactive', interactive: message.interactive },
    }
  }
  if (message.interactive?.list_reply?.title) {
    return {
      message_type: 'text',
      content: message.interactive.list_reply.title,
      metadata: { type: 'interactive', interactive: message.interactive },
    }
  }

  const type = String(message.type || '')
  const makeMedia = (media: any, fallbackContent: string) => {
    const filename = media?.filename
    const caption = media?.caption
    const content = caption || filename || fallbackContent
    const metadata = {
      type,
      media_id: media?.id,
      mime_type: media?.mime_type,
      sha256: media?.sha256,
      filename,
      caption,
    }
    return { message_type: type, content, metadata }
  }

  if (type === 'image' && message.image) return makeMedia(message.image, '[imagen]')
  if (type === 'document' && message.document) return makeMedia(message.document, '[documento]')
  if (type === 'audio' && message.audio) return makeMedia(message.audio, '[audio]')
  if (type === 'video' && message.video) return makeMedia(message.video, '[video]')
  if (type === 'sticker' && message.sticker) return makeMedia(message.sticker, '[sticker]')

  if (type) {
    return { message_type: type, content: `[${type} mensaje]`, metadata: { type } }
  }
  return { message_type: 'text', content: '', metadata: null }
}

function normalizePhoneNumber(value: string) {
  return String(value).replace("whatsapp:", "").replace(/\D/g, "")
}

async function hasMessagesExternalMessageIdColumn(): Promise<boolean> {
  if (_hasMessagesExternalMessageIdColumn !== null) return _hasMessagesExternalMessageIdColumn
  try {
    const rows: any[] = await sql!`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'messages'
        AND column_name = 'external_message_id'
      LIMIT 1
    `
    _hasMessagesExternalMessageIdColumn = Array.isArray(rows) && rows.length > 0
  } catch {
    _hasMessagesExternalMessageIdColumn = false
  }
  return _hasMessagesExternalMessageIdColumn
}

async function handleStatusUpdate(status: any) {
  const messageId = String(status?.id || "").trim()
  const state = String(status?.status || "").trim().toLowerCase()
  const ts = status?.timestamp ? Number.parseInt(String(status.timestamp), 10) * 1000 : null
  const when = ts && !Number.isNaN(ts) ? new Date(ts) : new Date()

  if (!messageId || !state) return

  try {
    // Always store last WhatsApp status in metadata for reconciliation.
    // (Accepted by API != delivered; statuses come async via webhook.)
    const errorText =
      state === "failed"
        ? String(status?.errors?.[0]?.title || status?.errors?.[0]?.message || status?.errors?.[0]?.error_data?.details || "")
        : ""

    const hasExternal = await hasMessagesExternalMessageIdColumn()

    if (hasExternal) {
      await sql!`
        UPDATE messages
        SET metadata =
          jsonb_set(
            jsonb_set(
              jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{whatsappStatus}',
                to_jsonb(${state}),
                true
              ),
              '{whatsappStatusAt}',
              to_jsonb(${when.toISOString()}),
              true
            ),
            '{whatsappError}',
            to_jsonb(${errorText}),
            true
          )
        WHERE external_message_id = ${messageId}
      `
    } else {
      // Fallback: match by metadata.send.externalMessageId (when external_message_id column doesn't exist)
      await sql!`
        UPDATE messages
        SET metadata =
          jsonb_set(
            jsonb_set(
              jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{whatsappStatus}',
                to_jsonb(${state}),
                true
              ),
              '{whatsappStatusAt}',
              to_jsonb(${when.toISOString()}),
              true
            ),
            '{whatsappError}',
            to_jsonb(${errorText}),
            true
          )
        WHERE (metadata->'send'->>'externalMessageId') = ${messageId}
      `
    }

    if (state === "read") {
      const hasReadAt = await hasMessagesReadAtColumn()
      if (hasReadAt) {
        if (hasExternal) {
          await sql!`
            UPDATE messages
            SET read_at = COALESCE(read_at, ${when})
            WHERE external_message_id = ${messageId}
          `
        } else {
          await sql!`
            UPDATE messages
            SET read_at = COALESCE(read_at, ${when})
            WHERE (metadata->'send'->>'externalMessageId') = ${messageId}
          `
        }
      }
    }
  } catch (e) {
    console.warn("[WhatsApp Webhook] Failed to process status:", { messageId, state, error: e instanceof Error ? e.message : String(e) })
  }
}