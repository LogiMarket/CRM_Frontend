import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!id) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 })
    }

    if (!status) {
      return NextResponse.json({ error: "Status required" }, { status: 400 })
    }

    const validStatuses = ["open", "assigned", "resolved", "closed"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // Try to update as UUID first, then as integer
    let result: any = await sql!`
      UPDATE conversations 
      SET status = ${status}, updated_at = NOW()
      WHERE id::text = ${id}
      RETURNING id, status
    `

    if (result.length === 0 && !isNaN(Number(id))) {
      result = await sql!`
        UPDATE conversations 
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${Number.parseInt(id)}
        RETURNING id, status
      `
    }

    if (result.length === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: result[0].id,
      status: result[0].status,
      message: "Status updated successfully",
    })
  } catch (error) {
    console.error("[Conversations Status] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
