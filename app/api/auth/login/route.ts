import { NextResponse } from "next/server"
import { authenticateUser } from "@/lib/auth"
import jwt from "jsonwebtoken"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      )
    }

    // Authenticate user
    const user = await authenticateUser(email, password)

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      )
    }

    // Generate JWT token
    const token = jwt.sign(
      { email: user.email, sub: user.id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: process.env.JWT_EXPIRATION || "7d" },
    )

    return NextResponse.json(
      {
        access_token: token,
        token_type: "Bearer",
        expires_in: process.env.JWT_EXPIRATION || "7d",
        user,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Login error:", error)

    if (error instanceof Error) {
      if (error.message.includes("connect")) {
        return NextResponse.json(
          {
            error: "Cannot connect to database. Verify DATABASE_URL and that PostgreSQL is running.",
          },
          { status: 500 },
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
