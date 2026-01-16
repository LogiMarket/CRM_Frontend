import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 })
    }

    // Try UUID format first, then integer
    let result: any = await sql!`
      SELECT 
        id, 
        status, 
        priority, 
        contact_id,
        assigned_agent_id,
        comments,
        created_at, 
        last_message_at
      FROM conversations 
      WHERE id::text = ${id}
      LIMIT 1
    `

    if (result.length === 0 && !isNaN(Number(id))) {
      result = await sql!`
        SELECT 
          id, 
          status, 
          priority, 
          contact_id,
          assigned_agent_id,
          comments,
          created_at, 
          last_message_at
        FROM conversations 
        WHERE id = ${Number.parseInt(id)}
        LIMIT 1
      `
    }

    if (result.length === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const conversation = result[0]

    // Check permissions based on user role
    if (user.role === "Agente") {
      // Agents can only access conversations assigned to them
      if (conversation.assigned_agent_id !== user.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    } else if (user.role !== "Administrador") {
      // Non-admin users (regular contacts/users) can only access their own conversations
      const contactCheck = await sql!`
        SELECT id FROM contacts WHERE id = ${conversation.contact_id} AND created_by_user_id = ${user.id}
      `
      if (contactCheck.length === 0) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }
    // Admins can access all conversations

    // Fetch contact info
    let contactResult: any = await sql!`
      SELECT name, phone_number FROM contacts WHERE id = ${conversation.contact_id}
    `

    const contact = contactResult.length > 0 ? contactResult[0] : { name: "Unknown", phone_number: "" }

    // Fetch agent info if assigned
    let agentResult: any = []
    if (conversation.assigned_agent_id) {
      agentResult = await sql!`
        SELECT name FROM users WHERE id = ${conversation.assigned_agent_id}
      `
    }

    const agent = agentResult.length > 0 ? agentResult[0] : null

    return NextResponse.json({
      id: conversation.id,
      status: conversation.status,
      priority: conversation.priority,
      comments: conversation.comments || "",
      created_at: conversation.created_at,
      last_message_at: conversation.last_message_at,
      contact_name: contact.name,
      phone_number: contact.phone_number,
      agent_name: agent?.name || null,
    })
  } catch (error) {
    console.error("[Conversations GET] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
