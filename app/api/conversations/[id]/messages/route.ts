import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql, isDemoMode } from "@/lib/db"
import { DEMO_MESSAGES } from "@/lib/demo-data"

const demoMessagesStore = [...DEMO_MESSAGES]

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = await params

    if (isDemoMode) {
      const conversationId = isNaN(Number(id)) ? id : Number.parseInt(id)
      const messages = demoMessagesStore
        .filter((m) => {
          if (typeof conversationId === "number") {
            return m.conversation_id === conversationId
          }
          return m.conversation_id === Number.parseInt(id)
        })
        .map((m) => ({
          id: m.id,
          content: m.content,
          sender_type: m.sender_type,
          sender_id: m.user_id || null,
          message_type: "text",
          created_at: m.created_at,
          sender_name: m.sender_type === "agent" ? user.name : "Cliente",
        }))

      return NextResponse.json({ messages })
    }

    // Query messages - try to get by UUID first, then try as integer
    let messages = []
    try {
      messages = await sql`
        SELECT 
          m.id,
          m.content,
          m.sender_type,
          m.sender_id,
          m.created_at,
          COALESCE(
            CASE WHEN m.sender_type = 'contact' THEN c.name END,
            CASE WHEN m.sender_type = 'agent' THEN u.name END,
            'Unknown'
          ) as sender_name
        FROM messages m
        LEFT JOIN contacts c ON m.sender_type = 'contact' AND m.sender_id = c.id
        LEFT JOIN users u ON m.sender_type = 'agent' AND m.sender_id = u.id
        WHERE m.conversation_id::text = ${id}
        ORDER BY m.created_at ASC
      `
    } catch (queryError) {
      console.error("[GET messages] Query with ::text failed, trying alternate:", queryError)
      // Try alternate approach if UUID casting fails
      messages = await sql`
        SELECT 
          m.id,
          m.content,
          m.sender_type,
          m.sender_id,
          m.created_at,
          COALESCE(
            CASE WHEN m.sender_type = 'contact' THEN c.name END,
            CASE WHEN m.sender_type = 'agent' THEN u.name END,
            'Unknown'
          ) as sender_name
        FROM messages m
        LEFT JOIN contacts c ON m.sender_type = 'contact' AND m.sender_id = c.id
        LEFT JOIN users u ON m.sender_type = 'agent' AND m.sender_id = u.id
        WHERE CAST(m.conversation_id AS VARCHAR) = ${id}
        ORDER BY m.created_at ASC
      `
    }

    // Mark messages as read - silently ignore if it fails
    try {
      await sql`
        UPDATE messages 
        SET read_at = NOW() 
        WHERE conversation_id::text = ${id}
          AND read_at IS NULL 
          AND sender_type = 'contact'
      `
    } catch (error) {
      console.error("[GET messages] Error marking as read:", error)
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("[GET messages] Error:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = await params
    const { content } = await request.json()

    if (!content || content.trim() === "") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    if (isDemoMode) {
      const newMessage = {
        id: demoMessagesStore.length + 1,
        conversation_id: Number.parseInt(id),
        sender_type: "agent" as const,
        user_id: user.id,
        content: content,
        created_at: new Date().toISOString(),
      }

      demoMessagesStore.push(newMessage)

      return NextResponse.json({
        message: {
          id: newMessage.id,
          content: newMessage.content,
          sender_type: newMessage.sender_type,
          sender_id: newMessage.user_id,
          message_type: "text",
          created_at: newMessage.created_at,
          sender_name: user.name,
        },
      })
    }

    // Try to insert message - handle both UUID and integer conversation_id
    let message = null
    try {
      // Try UUID first
      const result = await sql`
        INSERT INTO messages (conversation_id, sender_type, sender_id, content)
        VALUES (${id}::uuid, 'agent', ${user.id}, ${content})
        RETURNING id, content, sender_type, sender_id, created_at
      `
      message = result[0]
    } catch (uuidError) {
      console.error("[POST messages] UUID insert failed, trying integer:", uuidError)
      // Try as integer
      try {
        const result = await sql`
          INSERT INTO messages (conversation_id, sender_type, sender_id, content)
          VALUES (${Number.parseInt(id)}, 'agent', ${user.id}, ${content})
          RETURNING id, content, sender_type, sender_id, created_at
        `
        message = result[0]
      } catch (intError) {
        console.error("[POST messages] Integer insert also failed:", intError)
        throw intError
      }
    }

    // Update conversation last_message_at - try both formats
    try {
      await sql`
        UPDATE conversations 
        SET last_message_at = NOW() 
        WHERE id::text = ${id}
      `
    } catch (updateError) {
      console.error("[POST messages] Update failed (not critical):", updateError)
    }

    // Optional: forward message to external backend (WhatsApp sender)
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL
    if (backendUrl) {
      try {
        await fetch(`${backendUrl}/api/whatsapp/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: id, content }),
        })
      } catch (forwardError) {
        console.error("[POST messages] Forward to backend failed (non-blocking):", forwardError)
      }
    }

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        sender_type: message.sender_type,
        sender_id: message.sender_id,
        created_at: message.created_at,
        sender_name: user.name,
      },
    })
  } catch (error) {
    console.error("[POST messages] Error:", error)
    return NextResponse.json({ error: "Failed to send message", details: String(error) }, { status: 500 })
  }
}
