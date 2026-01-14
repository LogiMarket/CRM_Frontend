import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get count of active conversations per agent
    const result = await sql!`
      SELECT 
        u.id,
        u.name,
        u.email,
        r.name as role_name,
        COUNT(c.id) FILTER (WHERE c.status IN ('open', 'assigned')) as active_count,
        COUNT(c.id) FILTER (WHERE c.status = 'resolved') as resolved_count,
        COUNT(c.id) as total_count
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN conversations c ON c.assigned_agent_id = u.id
      WHERE r.name IN ('agent', 'agente', 'supervisor')
      GROUP BY u.id, u.name, u.email, r.name
      ORDER BY u.name
    `

    const agents = result.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role_name,
      active_conversations: parseInt(row.active_count) || 0,
      resolved_conversations: parseInt(row.resolved_count) || 0,
      total_conversations: parseInt(row.total_count) || 0,
    }))

    return NextResponse.json({ agents })
  } catch (error) {
    console.error("[Agents Stats] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
