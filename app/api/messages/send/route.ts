import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

const twilio = require("twilio")

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

/**
 * Send a message via Twilio Messaging Service
 * Automatically routes to correct channel (WhatsApp or Facebook Messenger)
 * 
 * POST /api/messages/send
 * Body: {
 *   "conversationId": "123",
 *   "text": "Hola, ¿cómo estás?"
 * }
 */

export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!sql) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const { conversationId, text } = await request.json()

    if (!conversationId || !text?.trim()) {
      return NextResponse.json(
        { error: "conversationId and text are required" },
        { status: 400 }
      )
    }

    console.log("[Send Message] Conversation:", conversationId, "Text:", text.substring(0, 50))

    // Get conversation details
    const conversation = await sql`
      SELECT 
        c.id,
        c.channel,
        c.external_user_id,
        c.contact_id,
        cnt.phone_number,
        cnt.external_user_id as contact_external_user_id
      FROM conversations c
      LEFT JOIN contacts cnt ON c.contact_id = cnt.id
      WHERE c.id = ${conversationId}
      LIMIT 1
    `

    if (!conversation || conversation.length === 0) {
      console.error("[Send Message] Conversation not found:", conversationId)
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const conv = conversation[0]
    const channel = conv.channel || "whatsapp"
    const externalUserId = conv.external_user_id || conv.contact_external_user_id

    if (!externalUserId) {
      console.error("[Send Message] No external user ID found")
      return NextResponse.json(
        { error: "Cannot determine recipient for this channel" },
        { status: 400 }
      )
    }

    console.log(`[Send Message] Sending via ${channel} to ${externalUserId}`)

    // Format recipient based on channel
    const toNumber =
      channel === "whatsapp"
        ? `whatsapp:${externalUserId}` // whatsapp:+521234567890
        : externalUserId // messenger:1234567890

    // Send via Twilio Messaging Service
    const messagingSid = process.env.TWILIO_MESSAGING_SERVICE_SID
    if (!messagingSid) {
      console.error("[Send Message] TWILIO_MESSAGING_SERVICE_SID not configured")
      return NextResponse.json(
        { error: "Messaging service not configured" },
        { status: 500 }
      )
    }

    const message = await client.messages.create({
      messagingServiceSid: messagingSid,
      to: toNumber,
      body: text.trim(),
    })

    console.log(`[Send Message] Message sent with SID: ${message.sid}`)

    // Save message to database
    const metadata = {
      twilioSid: message.sid,
      channel,
      status: message.status,
    }

    await sql`
      INSERT INTO messages (
        conversation_id,
        sender_type,
        sender_id,
        channel,
        external_message_id,
        direction,
        content,
        message_type,
        metadata,
        created_at
      ) VALUES (
        ${conversationId},
        'agent',
        ${user.id},
        ${channel},
        ${message.sid},
        'outbound',
        ${text.trim()},
        'text',
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

    return NextResponse.json(
      {
        success: true,
        messageSid: message.sid,
        status: message.status,
        channel,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[Send Message] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        error: "Failed to send message",
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for testing
 */
export async function GET(request: NextRequest) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  return NextResponse.json({
    message: "Send message endpoint",
    status: "ready",
    method: "POST",
    body: {
      conversationId: "number",
      text: "string",
    },
  })
}
