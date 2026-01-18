import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * Unified Twilio webhook endpoint for WhatsApp + Facebook Messenger
 * POST /api/inbound/twilio
 * 
 * Receives messages from Twilio in both channels:
 * - WhatsApp: From=whatsapp:+52..., To=whatsapp:+52...
 * - Facebook: From=messenger:<id>, To=zzz (Page ID)
 */

interface WebhookPayload {
  MessageSid: string
  From: string
  To: string
  Body?: string
  NumMedia: string
  MediaUrl0?: string
  AccountSid: string
  [key: string]: any
}

const extractChannel = (from: string): "whatsapp" | "messenger" => {
  if (from.startsWith("whatsapp:")) return "whatsapp"
  if (from.startsWith("messenger:")) return "messenger"
  return "whatsapp" // fallback
}

const normalizeUserIdentifier = (from: string): string => {
  // whatsapp:+521234567890 -> +521234567890
  // messenger:1234567890 -> messenger:1234567890
  return from.split(":").pop() || from
}

const ensureTablesExist = async () => {
  if (!sql) throw new Error("Database not configured")

  try {
    // Check if contacts table has channel column
    await sql`
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'whatsapp';
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS external_user_id VARCHAR(255);
    `

    // Check if conversations table has channel columns
    await sql`
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'whatsapp';
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_user_id VARCHAR(255);
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_conversation_id VARCHAR(255);
    `

    // Check if messages table has required columns
    await sql`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'whatsapp';
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_message_id VARCHAR(255) UNIQUE;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'inbound';
    `

    console.log("[ensureTablesExist] Multi-channel columns verified")
  } catch (error) {
    console.error("[ensureTablesExist] Error:", error)
    throw error
  }
}

const createOrGetContact = async (
  externalUserId: string,
  channel: "whatsapp" | "messenger",
  contactName?: string
): Promise<number> => {
  try {
    // Try to find existing contact
    const existing = await sql`
      SELECT id FROM contacts 
      WHERE external_user_id = ${externalUserId} AND channel = ${channel}
      LIMIT 1
    `

    if (existing && existing.length > 0) {
      console.log(`[createOrGetContact] Found existing contact: ${existing[0].id}`)
      return existing[0].id
    }

    // Create new contact
    const result = await sql`
      INSERT INTO contacts (
        external_user_id,
        channel,
        phone_number,
        name,
        created_at
      ) VALUES (
        ${externalUserId},
        ${channel},
        ${channel === "whatsapp" ? externalUserId : `messenger:${externalUserId}`},
        ${contactName || `${channel} User`},
        NOW()
      )
      RETURNING id
    `

    console.log(`[createOrGetContact] Created new contact: ${result[0].id}`)
    return result[0].id
  } catch (error) {
    console.error("[createOrGetContact] Error:", error)
    throw error
  }
}

const createOrGetConversation = async (
  contactId: number,
  externalUserId: string,
  channel: "whatsapp" | "messenger"
): Promise<number> => {
  try {
    // Try to find existing conversation
    const existing = await sql`
      SELECT id FROM conversations 
      WHERE contact_id = ${contactId} AND channel = ${channel}
      LIMIT 1
    `

    if (existing && existing.length > 0) {
      console.log(`[createOrGetConversation] Found existing conversation: ${existing[0].id}`)
      return existing[0].id
    }

    // Create new conversation
    const result = await sql`
      INSERT INTO conversations (
        contact_id,
        channel,
        external_user_id,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${contactId},
        ${channel},
        ${externalUserId},
        'open',
        NOW(),
        NOW()
      )
      RETURNING id
    `

    console.log(`[createOrGetConversation] Created new conversation: ${result[0].id}`)
    return result[0].id
  } catch (error) {
    console.error("[createOrGetConversation] Error:", error)
    throw error
  }
}

const saveMessage = async (
  conversationId: number,
  channel: "whatsapp" | "messenger",
  externalMessageId: string,
  body: string,
  mediaUrl?: string
): Promise<void> => {
  try {
    // Check if message already exists (prevent duplicates)
    const existing = await sql`
      SELECT id FROM messages 
      WHERE external_message_id = ${externalMessageId}
      LIMIT 1
    `

    if (existing && existing.length > 0) {
      console.log(`[saveMessage] Message already exists: ${externalMessageId}`)
      return
    }

    // Save message
    const metadata = mediaUrl ? { mediaUrl } : {}

    await sql`
      INSERT INTO messages (
        conversation_id,
        sender_type,
        channel,
        external_message_id,
        direction,
        content,
        message_type,
        metadata,
        created_at
      ) VALUES (
        ${conversationId},
        'contact',
        ${channel},
        ${externalMessageId},
        'inbound',
        ${body},
        ${mediaUrl ? "media" : "text"},
        ${JSON.stringify(metadata)},
        NOW()
      )
    `

    // Update conversation's last_message_at
    await sql`
      UPDATE conversations 
      SET last_message_at = NOW(), updated_at = NOW()
      WHERE id = ${conversationId}
    `

    console.log(`[saveMessage] Saved message for conversation ${conversationId}`)
  } catch (error) {
    console.error("[saveMessage] Error:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio
    const formData = await request.formData()
    const payload: WebhookPayload = {}

    for (const [key, value] of formData.entries()) {
      payload[key] = value
    }

    console.log("[Twilio Webhook] Received:", {
      MessageSid: payload.MessageSid,
      From: payload.From,
      To: payload.To,
      Body: payload.Body?.substring(0, 50),
    })

    // Validate required fields
    if (!payload.MessageSid || !payload.From || !payload.Body) {
      console.warn("[Twilio Webhook] Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Ensure tables have multi-channel columns
    await ensureTablesExist()

    // Extract channel from "From" field
    const channel = extractChannel(payload.From)
    const externalUserId = normalizeUserIdentifier(payload.From)

    console.log(`[Twilio Webhook] Channel: ${channel}, User: ${externalUserId}`)

    // Create or get contact
    const contactId = await createOrGetContact(externalUserId, channel)

    // Create or get conversation
    const conversationId = await createOrGetConversation(contactId, externalUserId, channel)

    // Extract media if present
    const mediaUrl = payload.NumMedia && payload.NumMedia !== "0" ? payload.MediaUrl0 : undefined

    // Save message
    await saveMessage(conversationId, channel, payload.MessageSid, payload.Body, mediaUrl)

    // Log webhook event
    try {
      await sql`
        INSERT INTO webhook_logs (channel, external_id, payload, processed)
        VALUES (
          ${channel},
          ${externalUserId},
          ${JSON.stringify(payload)},
          true
        )
      `
    } catch (logError) {
      console.warn("[Twilio Webhook] Could not log to webhook_logs:", logError)
    }

    // Return 200 to Twilio immediately
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[Twilio Webhook] Fatal error:", error)

    // Still return 200 so Twilio doesn't retry
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    )
  }
}

/**
 * GET for webhook verification (optional, for testing)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "Twilio inbound webhook endpoint", status: "ready" })
}
