import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id, messageId } = await params
  const { content } = await request.json()

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 })
  }

  try {
    const result = await sql!`
      UPDATE messages 
      SET content = ${content.trim()}, updated_at = NOW() 
      WHERE id = ${messageId} AND conversation_id = ${id} 
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    return NextResponse.json({ message: result[0] })
  } catch (error) {
    console.error("[PUT Messages] Error:", error)
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id, messageId } = await params

  try {
    const result = await sql!`
      DELETE FROM messages 
      WHERE id = ${messageId} AND conversation_id = ${id} 
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE Messages] Error:", error)
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 })
  }
}
