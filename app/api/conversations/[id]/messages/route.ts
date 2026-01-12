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
      const messages = demoMessagesStore
        .filter((m) => m.conversation_id === Number.parseInt(id))
        .map((m) => ({
          id: m.id,
          content: m.content,
          sender_type: m.sender_type,
          sender_id: m.user_id || null,
          message_type: "text",
          metadata: null,
          created_at: m.created_at,
          sender_name: m.sender_type === "agent" ? user.name : "Cliente",
        }))

      return NextResponse.json({ messages })
    }

    const messages = await sql`
      SELECT 
        m.id,
        m.content,
        m.sender_type,
        m.sender_id,
        m.message_type,
        m.metadata,
        m.created_at,
        CASE 
          WHEN m.sender_type = 'contact' THEN contacts.name
          WHEN m.sender_type = 'agent' THEN users.name
        END as sender_name
      FROM messages m
      LEFT JOIN contacts ON m.sender_type = 'contact' AND m.sender_id = contacts.id
      LEFT JOIN users ON m.sender_type = 'agent' AND m.sender_id = users.id
      WHERE m.conversation_id = ${id}
      ORDER BY m.created_at ASC
    `

    // Mark messages as read
    await sql`
      UPDATE messages 
      SET read_at = NOW() 
      WHERE conversation_id = ${id} 
        AND read_at IS NULL 
        AND sender_type = 'contact'
    `

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("[v0] Get messages error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
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

    const [message] = await sql`
      INSERT INTO messages (conversation_id, sender_type, sender_id, content, message_type)
      VALUES (${id}, 'agent', ${user.id}, ${content}, 'text')
      RETURNING id, content, sender_type, sender_id, message_type, created_at
    `

    // Update conversation last_message_at
    await sql`
      UPDATE conversations 
      SET last_message_at = NOW() 
      WHERE id = ${id}
    `

    return NextResponse.json({ message: { ...message, sender_name: user.name } })
  } catch (error) {
    console.error("[v0] Send message error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
