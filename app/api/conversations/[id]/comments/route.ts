import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

interface Comment {
  id: string
  text: string
  created_at: string
}

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

    // Parse existing comments or create new array
    let comments: Comment[] = []
    if (getResult[0].comments) {
      try {
        comments = JSON.parse(getResult[0].comments)
        if (!Array.isArray(comments)) {
          comments = []
        }
      } catch {
        comments = []
      }
    }

    // Add new comment
    const newComment: Comment = {
      id: `${Date.now()}`,
      text: comment,
      created_at: new Date().toISOString(),
    }
    comments.push(newComment)

    const commentsJson = JSON.stringify(comments)

    // Update comments
    let updateResult: any = []
    try {
      updateResult = await sql!`
        UPDATE conversations 
        SET comments = ${commentsJson}, updated_at = NOW()
        WHERE id::text = ${id}
        RETURNING id, comments
      `
    } catch (e) {
      if (!isNaN(Number(id))) {
        updateResult = await sql!`
          UPDATE conversations 
          SET comments = ${commentsJson}, updated_at = NOW()
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
      comments: comments,
      message: "Comment added successfully",
    })
  } catch (error) {
    console.error("[Conversations Comments] Error:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { commentId, text } = body

    if (!id) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 })
    }

    if (!commentId || !text) {
      return NextResponse.json({ error: "Comment ID and text required" }, { status: 400 })
    }

    console.log("[Comments PUT] Updating comment", commentId)

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

    // Parse comments
    let comments: Comment[] = []
    if (getResult[0].comments) {
      try {
        comments = JSON.parse(getResult[0].comments)
      } catch {
        return NextResponse.json({ error: "Invalid comments format" }, { status: 400 })
      }
    }

    // Find and update comment
    const commentIndex = comments.findIndex(c => c.id === commentId)
    if (commentIndex === -1) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    comments[commentIndex].text = text

    const commentsJson = JSON.stringify(comments)

    // Update in database
    let updateResult: any = []
    try {
      updateResult = await sql!`
        UPDATE conversations 
        SET comments = ${commentsJson}, updated_at = NOW()
        WHERE id::text = ${id}
        RETURNING id, comments
      `
    } catch (e) {
      if (!isNaN(Number(id))) {
        updateResult = await sql!`
          UPDATE conversations 
          SET comments = ${commentsJson}, updated_at = NOW()
          WHERE id = ${Number.parseInt(id)}
          RETURNING id, comments
        `
      } else {
        throw e
      }
    }

    console.log("[Comments PUT] Comment updated successfully")

    return NextResponse.json({
      id: id,
      comments: comments,
      message: "Comment updated successfully",
    })
  } catch (error) {
    console.error("[Conversations Comments] Error:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { commentId } = body

    if (!id) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 })
    }

    if (!commentId) {
      return NextResponse.json({ error: "Comment ID required" }, { status: 400 })
    }

    console.log("[Comments DELETE] Deleting comment", commentId)

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

    // Parse comments
    let comments: Comment[] = []
    if (getResult[0].comments) {
      try {
        comments = JSON.parse(getResult[0].comments)
      } catch {
        return NextResponse.json({ error: "Invalid comments format" }, { status: 400 })
      }
    }

    // Remove comment
    comments = comments.filter(c => c.id !== commentId)

    const commentsJson = JSON.stringify(comments)

    // Update in database
    let updateResult: any = []
    try {
      updateResult = await sql!`
        UPDATE conversations 
        SET comments = ${commentsJson}, updated_at = NOW()
        WHERE id::text = ${id}
        RETURNING id, comments
      `
    } catch (e) {
      if (!isNaN(Number(id))) {
        updateResult = await sql!`
          UPDATE conversations 
          SET comments = ${commentsJson}, updated_at = NOW()
          WHERE id = ${Number.parseInt(id)}
          RETURNING id, comments
        `
      } else {
        throw e
      }
    }

    console.log("[Comments DELETE] Comment deleted successfully")

    return NextResponse.json({
      id: id,
      comments: comments,
      message: "Comment deleted successfully",
    })
  } catch (error) {
    console.error("[Conversations Comments] Error:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
