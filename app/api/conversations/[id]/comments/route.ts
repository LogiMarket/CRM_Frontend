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

    // Por ahora, solo devolver éxito sin guardar en DB hasta que se cree la columna
    return NextResponse.json({
      id: id,
      comments: comment,
      message: "Comment added successfully (temporary)",
    })
  } catch (error) {
    console.error("[Conversations Comments] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
