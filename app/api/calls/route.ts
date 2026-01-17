import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"

const ensureCallsTable = async () => {
  if (!sql) throw new Error("Database not configured")
  
  try {
    // Check if table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'calls'
      )
    `
    
    if (!tableExists[0]?.exists) {
      console.log("[ensureCallsTable] Creating calls table...")
      
      // Create table
      await sql!`
        CREATE TABLE calls (
          id SERIAL PRIMARY KEY,
          agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
          conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
          contact_name TEXT,
          phone_number TEXT,
          scheduled_at TIMESTAMP NOT NULL,
          call_type VARCHAR(20) DEFAULT 'phone',
          notes TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `
      
      // Create indexes
      await sql!`CREATE INDEX idx_calls_agent ON calls(agent_id)`
      await sql!`CREATE INDEX idx_calls_conversation ON calls(conversation_id)`
      await sql!`CREATE INDEX idx_calls_status ON calls(status)`
      
      console.log("[ensureCallsTable] Table created successfully")
    }
  } catch (error) {
    console.error("[ensureCallsTable] Error:", error instanceof Error ? error.message : "Unknown error")
    throw error
  }
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
    const body = await request.json()
    const {
      contact_name,
      phone_number,
      conversation_id,
      scheduled_at,
      call_type,
      notes,
    } = body

    console.log("[POST Calls] Request body:", body)

    if (!scheduled_at) {
      return NextResponse.json({ error: "scheduled_at is required" }, { status: 400 })
    }

    // Validar formato de fecha
    const scheduledDate = new Date(scheduled_at)
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
    }

    console.log("[POST Calls] Creating call for user:", user.id)

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

    console.log("[POST Calls] Call created successfully:", result[0])
    return NextResponse.json({ call: result[0] }, { status: 201 })
  } catch (error) {
    console.error("[POST Calls] Error:", error)
    return NextResponse.json({ 
      error: "Failed to create call",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
