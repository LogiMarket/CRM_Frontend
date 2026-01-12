import { NextResponse } from "next/server"
import { authenticateUser } from "@/lib/auth"
import { createSession, setSessionCookie } from "@/lib/session"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    console.log("[v0] Login attempt for:", email)

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const user = await authenticateUser(email, password)

    console.log("[v0] Authentication result:", user ? "Success" : "Failed")

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const token = await createSession(user)
    await setSessionCookie(token)

    return NextResponse.json({ user })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
