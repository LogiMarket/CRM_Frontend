import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { sql } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email requerido" },
        { status: 400 },
      )
    }

    if (!sql) {
      return NextResponse.json(
        { error: "Base de datos no configurada" },
        { status: 500 },
      )
    }

    // Buscar el usuario
    const users = await sql`
      SELECT id, email, name, email_verified
      FROM users
      WHERE email = ${email}
    `

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      )
    }

    const user = users[0]

    if (user.email_verified) {
      return NextResponse.json(
        { message: "Email ya fue verificado anteriormente" },
        { status: 200 },
      )
    }

    // Generar nuevo código de verificación
    const verificationCode = require("crypto").randomBytes(32).toString("hex")
    const verificationCodeHash = await hash(verificationCode, 10)

    // Actualizar código de verificación
    await sql`
      UPDATE users
      SET verification_code = ${verificationCodeHash}
      WHERE id = ${user.id}
    `

    // Enviar email
    const verificationLink = `${process.env.NEXT_PUBLIC_API_URL}/verify-email?code=${encodeURIComponent(verificationCode)}&email=${encodeURIComponent(email)}`
    const emailSent = await sendVerificationEmail(
      email,
      user.name,
      verificationCode,
      verificationLink,
    )

    if (!emailSent) {
      return NextResponse.json(
        { error: "Error al enviar el correo de verificación" },
        { status: 500 },
      )
    }

    return NextResponse.json(
      { message: "Email de verificación reenviado exitosamente" },
      { status: 200 },
    )
  } catch (error) {
    console.error("Resend verification error:", error)
    return NextResponse.json(
      { error: "Error al reenviar el correo de verificación" },
      { status: 500 },
    )
  }
}
