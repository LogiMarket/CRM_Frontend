import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// Webhook verification (GET request from Facebook)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get("hub.mode")
    const token = searchParams.get("hub.verify_token")
    const challenge = searchParams.get("hub.challenge")

    const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN

    console.log("[Facebook Webhook] Verification request:", { mode, token })

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[Facebook Webhook] Verification successful")
      return new NextResponse(challenge, { status: 200 })
    }

    console.log("[Facebook Webhook] Verification failed")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  } catch (error) {
    console.error("[Facebook Webhook] Verification error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// Handle incoming messages (POST request from Facebook)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("[Facebook Webhook] Received:", JSON.stringify(body, null, 2))

    // Log webhook for debugging
    await sql!`
      INSERT INTO webhook_logs (channel, external_id, payload, processed)
      VALUES ('facebook', ${body.entry?.[0]?.id || 'unknown'}, ${JSON.stringify(body)}, false)
    `

    // Process each entry
    for (const entry of body.entry || []) {
      const pageId = entry.id

      // Process messaging events
      for (const event of entry.messaging || []) {
        if (event.message && !event.message.is_echo) {
          await handleIncomingMessage(event, pageId)
        }
      }
    }

    // Mark webhook as processed
    await sql!`
      UPDATE webhook_logs 
      SET processed = true 
      WHERE channel = 'facebook' 
        AND external_id = ${body.entry?.[0]?.id || 'unknown'}
        AND created_at >= NOW() - INTERVAL '1 minute'
    `

    return NextResponse.json({ status: "ok" }, { status: 200 })
  } catch (error) {
    console.error("[Facebook Webhook] Error processing message:", error)
    
    // Log error
    try {
      await sql!`
        UPDATE webhook_logs 
        SET error = ${error instanceof Error ? error.message : String(error)}, processed = false
        WHERE channel = 'facebook' 
          AND created_at >= NOW() - INTERVAL '1 minute'
        ORDER BY created_at DESC
        LIMIT 1
      `
    } catch (logError) {
      console.error("[Facebook Webhook] Error logging error:", logError)
    }

    return NextResponse.json({ status: "error" }, { status: 500 })
  }
}

async function handleIncomingMessage(event: any, pageId: string) {
  const senderId = event.sender.id
  const recipientId = event.recipient.id
  const messageText = event.message.text
  const messageId = event.message.mid
  const timestamp = event.timestamp

  console.log("[Facebook] Processing message:", {
    senderId,
    messageText,
    messageId,
    timestamp,
  })

  try {
    // 1. Find or create contact
    let contact = await sql!`
      SELECT * FROM contacts 
      WHERE external_user_id = ${senderId} 
        AND channel = 'facebook'
      LIMIT 1
    `

    if (contact.length === 0) {
      // Get user profile from Facebook Graph API
      const userProfile = await fetchFacebookProfile(senderId)
      
      contact = await sql!`
        INSERT INTO contacts (
          name, 
          phone_number, 
          channel, 
          external_user_id,
          created_at
        )
        VALUES (
          ${userProfile.name || `Facebook User ${senderId.slice(-8)}`},
          ${`fb_${senderId}`},
          'facebook',
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
        AND channel = 'facebook'
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
          'facebook',
          ${senderId},
          ${`${pageId}_${senderId}`},
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
        created_at
      )
      VALUES (
        ${conversationId},
        'customer',
        ${messageText || ''},
        'facebook',
        ${messageId},
        'inbound',
        ${new Date(timestamp)}
      )
    `

    // 4. Update conversation last_message_at
    await sql!`
      UPDATE conversations 
      SET updated_at = NOW()
      WHERE id = ${conversationId}
    `

    console.log("[Facebook] Message processed successfully")
  } catch (error) {
    console.error("[Facebook] Error handling message:", error)
    throw error
  }
}

async function fetchFacebookProfile(userId: string) {
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${userId}?fields=name,first_name,last_name,profile_pic&access_token=${accessToken}`
    )
    
    if (!response.ok) {
      console.error("[Facebook] Failed to fetch profile:", await response.text())
      return { name: `Facebook User ${userId.slice(-8)}` }
    }
    
    return await response.json()
  } catch (error) {
    console.error("[Facebook] Error fetching profile:", error)
    return { name: `Facebook User ${userId.slice(-8)}` }
  }
}
