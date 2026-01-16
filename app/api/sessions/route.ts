import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"

export async function GET(request: NextRequest) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const sessions = await sql!`
      SELECT * FROM user_sessions 
      WHERE agent_id = ${user.id}
      ORDER BY session_date DESC
    `

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("[GET Sessions] Error:", error)
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const {
      user_name,
      user_email,
      session_type,
      duration_minutes,
      notes,
      outcomes,
      session_date,
    } = await request.json()

    const result = await sql!`
      INSERT INTO user_sessions (
        agent_id,
        user_name,
        user_email,
        session_type,
        duration_minutes,
        notes,
        outcomes,
        session_date,
        created_at
      ) VALUES (
        ${user.id},
        ${user_name},
        ${user_email},
        ${session_type},
        ${duration_minutes},
        ${notes || null},
        ${outcomes || null},
        ${session_date},
        NOW()
      )
      RETURNING *
    `

    return NextResponse.json({ session: result[0] }, { status: 201 })
  } catch (error) {
    console.error("[POST Sessions] Error:", error)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}
