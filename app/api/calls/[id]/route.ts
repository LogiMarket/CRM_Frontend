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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params
  const { status } = await request.json()

  try {
    await ensureCallsTable()
    const result = await sql!`
      UPDATE calls 
      SET status = ${status}, updated_at = NOW() 
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    return NextResponse.json({ call: result[0] })
  } catch (error) {
    console.error("[PUT Call] Error:", error)
    return NextResponse.json({ error: "Failed to update call" }, { status: 500 })
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
    await ensureCallsTable()
    const result = await sql!`
      DELETE FROM calls 
      WHERE id = ${id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE Call] Error:", error)
    return NextResponse.json({ error: "Failed to delete call" }, { status: 500 })
  }
}
