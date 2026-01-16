import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"

const ensureSessionsTable = async () => {
  if (!sql) throw new Error("Database not configured")
  await sql!`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_name TEXT NOT NULL,
      user_email TEXT NOT NULL,
      session_type VARCHAR(30) DEFAULT 'consultation',
      duration_minutes INTEGER DEFAULT 30,
      notes TEXT,
      outcomes TEXT,
      session_date TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_agent ON user_sessions(agent_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_date ON user_sessions(session_date);
  `
}

export async function GET(request: NextRequest) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    await ensureSessionsTable()
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
    await ensureSessionsTable()
    const {
      user_name,
      user_email,
      session_type,
      duration_minutes,
      notes,
      outcomes,
      session_date,
    } = await request.json()

    if (!session_date) {
      return NextResponse.json({ error: "session_date is required" }, { status: 400 })
    }

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
        ${session_type || 'consultation'},
        ${duration_minutes || 30},
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
