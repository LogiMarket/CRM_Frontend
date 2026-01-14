import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { comment } = body

    if (!id) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 })
    }

    if (!comment || typeof comment !== "string") {
      return NextResponse.json({ error: "Comment required" }, { status: 400 })
    }

    const sql = pool.query.bind(pool)

    // Get current comments
    let conversationResult: any = await sql`
      SELECT comments FROM conversations 
      WHERE id::text = ${id}
    `

    if (conversationResult.length === 0 && !isNaN(Number(id))) {
      conversationResult = await sql`
        SELECT comments FROM conversations 
        WHERE id = ${Number.parseInt(id)}
      `
    }

    if (conversationResult.length === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const currentComments = conversationResult[0].comments || ""
    const timestamp = new Date().toLocaleString("es-MX")
    const newComments = currentComments
      ? `${currentComments}\n\n[${timestamp}]\n${comment}`
      : `[${timestamp}]\n${comment}`

    // Update comments
    let result: any = await sql`
      UPDATE conversations 
      SET comments = ${newComments}, updated_at = NOW()
      WHERE id::text = ${id}
      RETURNING id, comments
    `

    if (result.length === 0 && !isNaN(Number(id))) {
      result = await sql`
        UPDATE conversations 
        SET comments = ${newComments}, updated_at = NOW()
        WHERE id = ${Number.parseInt(id)}
        RETURNING id, comments
      `
    }

    if (result.length === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: result[0].id,
      comments: result[0].comments,
      message: "Comment added successfully",
    })
  } catch (error) {
    console.error("[Conversations Comments] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
