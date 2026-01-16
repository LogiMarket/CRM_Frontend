import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"

export async function GET(request: NextRequest) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
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
    const {
      contact_name,
      phone_number,
      conversation_id,
      scheduled_at,
      call_type,
      notes,
    } = await request.json()

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
        ${contact_name},
        ${phone_number},
        ${scheduled_at},
        ${call_type},
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
