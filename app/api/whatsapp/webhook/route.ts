import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import crypto from "crypto"

export const runtime = "nodejs"

// Webhook verification (GET request from Meta)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get("hub.mode")
    const token = searchParams.get("hub.verify_token")
    const challenge = searchParams.get("hub.challenge")

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

    console.log("[WhatsApp Webhook] Verification request:", { mode, token })

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
    const rawBody = await request.text()
    const signature = request.headers.get("x-hub-signature-256")

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[WhatsApp Webhook] Invalid signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    console.log("[WhatsApp Webhook] Received:", JSON.stringify(body, null, 2))

    // Log webhook for debugging
    await sql!`
      INSERT INTO webhook_logs (channel, external_id, payload, processed)
      VALUES ('whatsapp', ${body.entry?.[0]?.id || "unknown"}, ${JSON.stringify(body)}, false)
    `

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value
        const metadata = value?.metadata
        const phoneNumberId = metadata?.phone_number_id || "unknown"

        const contactsByWaId = new Map<string, string>()
        for (const contact of value?.contacts || []) {
          const waId = contact?.wa_id
          const name = contact?.profile?.name
          if (waId) {
            contactsByWaId.set(waId, name || `WhatsApp ${waId.slice(-6)}`)
          }
        }

        for (const message of value?.messages || []) {
          await handleIncomingMessage(message, phoneNumberId, contactsByWaId)
        }
      }
    }

    // Mark webhook as processed
    await sql!`
      UPDATE webhook_logs 
      SET processed = true 
      WHERE channel = 'whatsapp' 
        AND external_id = ${body.entry?.[0]?.id || "unknown"}
        AND created_at >= NOW() - INTERVAL '1 minute'
    `

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
  const contactName = contactsByWaId.get(senderId) || `WhatsApp ${String(senderId).slice(-6)}`

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