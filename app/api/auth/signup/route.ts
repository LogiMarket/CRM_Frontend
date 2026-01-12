import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email}
    `

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Hash password
    const passwordHash = await hash(password, 10)

    // Create user
    const result = await sql`
      INSERT INTO users (email, password_hash, name, role, status)
      VALUES (${email}, ${passwordHash}, ${name}, 'agent', 'available')
      RETURNING id, email, name, role, status
    `

    return NextResponse.json({
      message: "User created successfully",
      user: result[0],
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
