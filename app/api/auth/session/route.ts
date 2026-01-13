import { NextResponse } from "next/server"
import { createSession, setSessionCookie } from "@/lib/session"
import type { User } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { user } = (await request.json()) as { user: User }
    if (!user) {
      return NextResponse.json({ error: "Missing user" }, { status: 400 })
    }

    const token = await createSession(user)
    await setSessionCookie(token)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("session set error", error)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}
