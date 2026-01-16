import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params
  const {
    user_name,
    user_email,
    session_type,
    duration_minutes,
    notes,
    outcomes,
  } = await request.json()

  try {
    const result = await sql!`
      UPDATE user_sessions 
      SET 
        user_name = ${user_name},
        user_email = ${user_email},
        session_type = ${session_type},
        duration_minutes = ${duration_minutes},
        notes = ${notes || null},
        outcomes = ${outcomes || null},
        updated_at = NOW()
      WHERE id = ${id} AND agent_id = ${user.id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    return NextResponse.json({ session: result[0] })
  } catch (error) {
    console.error("[PUT Session] Error:", error)
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params

  try {
    const result = await sql!`
      DELETE FROM user_sessions 
      WHERE id = ${id} AND agent_id = ${user.id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE Session] Error:", error)
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 })
  }
}
