import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { comment } = body

    if (!id) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 })
    }

    if (!comment || typeof comment !== "string") {
      return NextResponse.json({ error: "Comment required" }, { status: 400 })
    }

    console.log("[Comments POST] Saving comment for conversation", id)

    // Get current comments
    let getResult: any = []
    try {
      getResult = await sql!`
        SELECT comments FROM conversations WHERE id::text = ${id}
      `
    } catch (e) {
      if (!isNaN(Number(id))) {
        getResult = await sql!`
          SELECT comments FROM conversations WHERE id = ${Number.parseInt(id)}
        `
      } else {
        throw e
      }
    }

    if (getResult.length === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const currentComments = getResult[0].comments || ""
    const newComments = currentComments ? `${currentComments}\n${comment}` : comment

    // Update comments
    let updateResult: any = []
    try {
      updateResult = await sql!`
        UPDATE conversations 
        SET comments = ${newComments}, updated_at = NOW()
        WHERE id::text = ${id}
        RETURNING id, comments
      `
    } catch (e) {
      if (!isNaN(Number(id))) {
        updateResult = await sql!`
          UPDATE conversations 
          SET comments = ${newComments}, updated_at = NOW()
          WHERE id = ${Number.parseInt(id)}
          RETURNING id, comments
        `
      } else {
        throw e
      }
    }

    console.log("[Comments POST] Comments saved successfully")

    return NextResponse.json({
      id: id,
      comments: newComments,
      message: "Comment added successfully",
    })
  } catch (error) {
    console.error("[Conversations Comments] Error:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
