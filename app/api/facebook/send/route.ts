import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { recipientId, message, conversationId } = body

    if (!recipientId || !message) {
      return NextResponse.json(
        { error: "recipientId and message are required" },
        { status: 400 }
      )
    }

    const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN

    if (!accessToken) {
      console.error("[Facebook Send] PAGE_ACCESS_TOKEN not configured")
      return NextResponse.json(
        { error: "Facebook not configured" },
        { status: 500 }
      )
    }

    // Send message via Facebook Graph API
    const response = await fetch("https://graph.facebook.com/v18.0/me/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
        access_token: accessToken,
        messaging_type: "RESPONSE",
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("[Facebook Send] Error:", result)
      return NextResponse.json(
        { error: result.error?.message || "Failed to send message" },
        { status: response.status }
      )
    }

    console.log("[Facebook Send] Message sent successfully:", result)

    // Save message to database if conversationId provided
    if (conversationId) {
      try {
        await sql!`
          INSERT INTO messages (
            conversation_id,
            sender_type,
            content,
            channel,
            external_message_id,
            direction,
            created_at
          )
          VALUES (
            ${conversationId},
            'agent',
            ${message},
            'facebook',
            ${result.message_id},
            'outbound',
            NOW()
          )
        `

        // Update conversation timestamp
        await sql!`
          UPDATE conversations 
          SET updated_at = NOW()
          WHERE id = ${conversationId}
        `
      } catch (dbError) {
        console.error("[Facebook Send] Error saving to DB:", dbError)
        // Don't fail the request if DB save fails
      }
    }

    return NextResponse.json({
      success: true,
      messageId: result.message_id,
      recipientId: result.recipient_id,
    })
  } catch (error) {
    console.error("[Facebook Send] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
