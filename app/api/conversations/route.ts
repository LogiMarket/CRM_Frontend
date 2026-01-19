import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql, isDemoMode } from "@/lib/db"
import { DEMO_CONVERSATIONS } from "@/lib/demo-data"

export async function GET(request: Request) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (isDemoMode) {
      const { searchParams } = new URL(request.url)
      const status = searchParams.get("status") || "all"

      let conversations = DEMO_CONVERSATIONS.map((conv) => ({
        id: conv.id,
        status: conv.status,
        priority: conv.priority,
        last_message_at: conv.last_message_at,
        assigned_agent_id: conv.assigned_agent_id,
        contact_id: conv.contact_id,
        contact_name: conv.contact.name,
        phone_number: conv.contact.phone_number,
        contact_avatar: conv.contact.avatar_url,
        agent_name: conv.assigned_agent?.name,
        last_message: status === "open" ? "Último mensaje..." : "Conversación cerrada",
        unread_count: conv.unread_count,
      }))

      if (status !== "all") {
        conversations = conversations.filter((c) => c.status === status)
      }

      return NextResponse.json({ conversations })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"
    const userRole = user.role

    let conversations

    // Build query based on user role and status
    if (userRole === "Administrador") {
      // Admin can see all conversations
      if (status === "all") {
        conversations = await sql`
          SELECT 
            c.id,
            c.status,
            c.priority,
            c.last_message_at,
            c.assigned_agent_id,
            c.contact_id,
            COALESCE(c.channel, 'whatsapp') as channel,
            c.external_user_id,
            contacts.name as contact_name,
            contacts.phone_number,
            contacts.avatar_url as contact_avatar,
            u.name as agent_name,
            (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND read_at IS NULL AND sender_type = 'contact') as unread_count
          FROM conversations c
          LEFT JOIN contacts ON c.contact_id = contacts.id
          LEFT JOIN users u ON c.assigned_agent_id = u.id
          ORDER BY c.last_message_at DESC
          LIMIT 50
        `
      } else {
        conversations = await sql`
          SELECT 
            c.id,
            c.status,
            c.priority,
            c.last_message_at,
            c.assigned_agent_id,
            c.contact_id,
            contacts.name as contact_name,
            contacts.phone_number,
            contacts.avatar_url as contact_avatar,
            u.name as agent_name,
            (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND read_at IS NULL AND sender_type = 'contact') as unread_count
          FROM conversations c
          LEFT JOIN contacts ON c.contact_id = contacts.id
          LEFT JOIN users u ON c.assigned_agent_id = u.id
          WHERE c.status = ${status}
          ORDER BY c.last_message_at DESC
          LIMIT 50
        `
      }
    } else if (userRole === "Agente") {
      // Agent can only see conversations assigned to them
      if (status === "all") {
        conversations = await sql`
          SELECT 
            c.id,
            c.status,
            c.priority,
            c.last_message_at,
            c.assigned_agent_id,
            c.contact_id,
            contacts.name as contact_name,
            contacts.phone_number,
            contacts.avatar_url as contact_avatar,
            u.name as agent_name,
            (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND read_at IS NULL AND sender_type = 'contact') as unread_count
          FROM conversations c
          LEFT JOIN contacts ON c.contact_id = contacts.id
          LEFT JOIN users u ON c.assigned_agent_id = u.id
          WHERE c.assigned_agent_id = ${user.id}
          ORDER BY c.last_message_at DESC
          LIMIT 50
        `
      } else {
        conversations = await sql`
          SELECT 
            c.id,
            c.status,
            c.priority,
            c.last_message_at,
            c.assigned_agent_id,
            c.contact_id,
            contacts.name as contact_name,
            contacts.phone_number,
            contacts.avatar_url as contact_avatar,
            u.name as agent_name,
            (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND read_at IS NULL AND sender_type = 'contact') as unread_count
          FROM conversations c
          LEFT JOIN contacts ON c.contact_id = contacts.id
          LEFT JOIN users u ON c.assigned_agent_id = u.id
          WHERE c.assigned_agent_id = ${user.id} AND c.status = ${status}
          ORDER BY c.last_message_at DESC
          LIMIT 50
        `
      }
    } else {
      // Regular users can see their own conversations
      if (status === "all") {
        conversations = await sql`
          SELECT 
            c.id,
            c.status,
            c.priority,
            c.last_message_at,
            c.assigned_agent_id,
            c.contact_id,
            contacts.name as contact_name,
            contacts.phone_number,
            contacts.avatar_url as contact_avatar,
            u.name as agent_name,
            (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND read_at IS NULL AND sender_type = 'contact') as unread_count
          FROM conversations c
          LEFT JOIN contacts ON c.contact_id = contacts.id
          LEFT JOIN users u ON c.assigned_agent_id = u.id
          WHERE c.contact_id IN (SELECT id FROM contacts WHERE created_by_user_id = ${user.id})
          ORDER BY c.last_message_at DESC
          LIMIT 50
        `
      } else {
        conversations = await sql`
          SELECT 
            c.id,
            c.status,
            c.priority,
            c.last_message_at,
            c.assigned_agent_id,
            c.contact_id,
            contacts.name as contact_name,
            contacts.phone_number,
            contacts.avatar_url as contact_avatar,
            u.name as agent_name,
            (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND read_at IS NULL AND sender_type = 'contact') as unread_count
          FROM conversations c
          LEFT JOIN contacts ON c.contact_id = contacts.id
          LEFT JOIN users u ON c.assigned_agent_id = u.id
          WHERE c.contact_id IN (SELECT id FROM contacts WHERE created_by_user_id = ${user.id}) AND c.status = ${status}
          ORDER BY c.last_message_at DESC
          LIMIT 50
        `
      }
    }

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error("[v0] Get conversations error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
