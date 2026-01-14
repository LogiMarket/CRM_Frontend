import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql, isDemoMode } from "@/lib/db"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = await params
    const { agentId } = await request.json()

    if (isDemoMode) {
      return NextResponse.json({ success: true })
    }

    // Handle both UUID and integer IDs - try UUID cast first, then fallback to integer
    let result = await sql!`
      UPDATE conversations 
      SET assigned_agent_id = ${agentId}, updated_at = NOW()
      WHERE id::text = ${id}
      RETURNING id
    `

    // If no rows affected, try as integer
    if (result.length === 0 && !isNaN(Number(id))) {
      result = await sql!`
        UPDATE conversations 
        SET assigned_agent_id = ${agentId}, updated_at = NOW()
        WHERE id = ${Number.parseInt(id)}
        RETURNING id
      `
    }

    if (result.length === 0) {
      return NextResponse.json({ error: "Conversation not found", details: `No conversation with id ${id}` }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Conversation assigned successfully", conversationId: result[0].id })
  } catch (error) {
    console.error("[Assign] Error:", error)
    return NextResponse.json({ error: "Failed to assign conversation", details: String(error) }, { status: 500 })
  }
}
