import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql, isDemoMode } from "@/lib/db"
import { DEMO_USERS } from "@/lib/demo-data"

export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (isDemoMode) {
      const agents = DEMO_USERS.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        status: u.status,
        avatar_url: u.avatar_url,
      }))
      return NextResponse.json({ agents })
    }

    const agents = await sql`
      SELECT 
        id,
        name,
        email,
        status,
        avatar_url
      FROM users
      WHERE role IN ('agent', 'admin')
      ORDER BY name ASC
    `

    return NextResponse.json({ agents })
  } catch (error) {
    console.error("[v0] Get agents error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
