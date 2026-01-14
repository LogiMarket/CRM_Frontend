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

    // Handle both UUID and integer IDs
    await sql`
      UPDATE conversations 
      SET assigned_agent_id = ${agentId}, updated_at = NOW()
      WHERE id::text = ${id} OR id = ${Number.parseInt(id)}
    `

    return NextResponse.json({ success: true, message: "Conversation assigned successfully" })
  } catch (error) {
    console.error("[Assign] Error:", error)
    return NextResponse.json({ error: "Failed to assign conversation", details: String(error) }, { status: 500 })
  }
}
