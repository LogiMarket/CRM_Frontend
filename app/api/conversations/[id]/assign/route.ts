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

    await sql`
      UPDATE conversations 
      SET assigned_agent_id = ${agentId}, updated_at = NOW()
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Assign conversation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
