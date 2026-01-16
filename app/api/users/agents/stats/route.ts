import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("[Agents Stats] Fetching agent statistics...")

    // Get count of active conversations per agent
    const result = await sql!`
      SELECT 
        u.id,
        u.name,
        u.email,
        r.name as role_name,
        COUNT(c.id) as total_count,
        COUNT(c.id) as active_count,
        0 as resolved_count
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN conversations c ON c.assigned_agent_id = u.id
      WHERE r.name IN ('agent', 'agente', 'supervisor', 'admin', 'administrador')
      GROUP BY u.id, u.name, u.email, r.name
      ORDER BY u.name
    `

    console.log("[Agents Stats] Query result:", result.length, "agents")

    const agents = result.map((row: any) => ({
      id: String(row.id),
      name: row.name,
      email: row.email,
      role: row.role_name,
      active_conversations: parseInt(row.active_count) || 0,
      resolved_conversations: parseInt(row.resolved_count) || 0,
      total_conversations: parseInt(row.total_count) || 0,
    }))

    console.log("[Agents Stats] Mapped agents:", agents)

    return NextResponse.json({ agents })
  } catch (error) {
    console.error("[Agents Stats] Error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
