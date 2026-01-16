import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"

const ensureCallsTable = async () => {
  if (!sql) throw new Error("Database not configured")
  await sql!`
    CREATE TABLE IF NOT EXISTS calls (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
      contact_name TEXT,
      phone_number TEXT,
      scheduled_at TIMESTAMP NOT NULL,
      call_type VARCHAR(20) DEFAULT 'phone',
      notes TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_calls_agent ON calls(agent_id);
    CREATE INDEX IF NOT EXISTS idx_calls_conversation ON calls(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
  `
}

export async function GET(request: NextRequest) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    await ensureCallsTable()
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversation_id")

    let query
    if (conversationId) {
      query = await sql!`
        SELECT * FROM calls 
        WHERE conversation_id = ${conversationId}
        ORDER BY scheduled_at DESC
      `
    } else {
      query = await sql!`
        SELECT * FROM calls 
        WHERE agent_id = ${user.id}
        ORDER BY scheduled_at DESC
      `
    }

    return NextResponse.json({ calls: query })
  } catch (error) {
    console.error("[GET Calls] Error:", error)
    return NextResponse.json({ error: "Failed to fetch calls" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    await ensureCallsTable()
    const {
      contact_name,
      phone_number,
      conversation_id,
      scheduled_at,
      call_type,
      notes,
    } = await request.json()

    if (!scheduled_at) {
      return NextResponse.json({ error: "scheduled_at is required" }, { status: 400 })
    }

    const result = await sql!`
      INSERT INTO calls (
        agent_id,
        conversation_id,
        contact_name,
        phone_number,
        scheduled_at,
        call_type,
        notes,
        status,
        created_at
      ) VALUES (
        ${user.id},
        ${conversation_id || null},
        ${contact_name || null},
        ${phone_number || null},
        ${scheduled_at},
        ${call_type || 'phone'},
        ${notes || null},
        'pending',
        NOW()
      )
      RETURNING *
    `

    return NextResponse.json({ call: result[0] }, { status: 201 })
  } catch (error) {
    console.error("[POST Calls] Error:", error)
    return NextResponse.json({ error: "Failed to create call" }, { status: 500 })
  }
}
