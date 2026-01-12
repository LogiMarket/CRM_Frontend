import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql, isDemoMode } from "@/lib/db"
import { DEMO_MACROS } from "@/lib/demo-data"

const demoMacrosStore = [...DEMO_MACROS]

export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (isDemoMode) {
      const macros = demoMacrosStore.map((m) => ({
        ...m,
        created_by_name: user.name,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      }))
      return NextResponse.json({ macros })
    }

    const macros = await sql`
      SELECT 
        m.id,
        m.title,
        m.content,
        m.shortcut,
        m.usage_count,
        m.created_at,
        u.name as created_by_name
      FROM macros m
      LEFT JOIN users u ON m.created_by = u.id
      ORDER BY m.usage_count DESC, m.title ASC
    `

    return NextResponse.json({ macros })
  } catch (error) {
    console.error("[v0] Get macros error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { title, content, shortcut } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    if (isDemoMode) {
      const newMacro = {
        id: demoMacrosStore.length + 1,
        title,
        content,
        shortcut: shortcut || `/macro${demoMacrosStore.length + 1}`,
        created_by: user.id,
        usage_count: 0,
      }
      demoMacrosStore.push(newMacro)

      return NextResponse.json({
        macro: {
          ...newMacro,
          created_at: new Date().toISOString(),
        },
      })
    }

    const [macro] = await sql`
      INSERT INTO macros (title, content, shortcut, created_by)
      VALUES (${title}, ${content}, ${shortcut || null}, ${user.id})
      RETURNING id, title, content, shortcut, usage_count, created_at
    `

    return NextResponse.json({ macro })
  } catch (error) {
    console.error("[v0] Create macro error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
