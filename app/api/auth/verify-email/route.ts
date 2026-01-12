import { NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { sql } from "@/lib/db"
import { sendWelcomeEmail } from "@/lib/email"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const email = searchParams.get("email")

    if (!code || !email) {
      return NextResponse.json(
        { error: "Código o email faltante" },
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
      SELECT id, email, name, verification_code, email_verified
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

    // Verificar que el código sea válido
    const isValidCode = await compare(code, user.verification_code)

    if (!isValidCode) {
      return NextResponse.json(
        { error: "Código de verificación inválido" },
        { status: 401 },
      )
    }

    // Marcar email como verificado
    await sql`
      UPDATE users
      SET email_verified = true, verification_code = NULL
      WHERE id = ${user.id}
    `

    // Enviar email de bienvenida
    await sendWelcomeEmail(email, user.name)

    return NextResponse.json(
      { message: "Email verificado exitosamente. Ya puedes iniciar sesión." },
      { status: 200 },
    )
  } catch (error) {
    console.error("Verification error:", error)
    return NextResponse.json(
      { error: "Error al verificar el email" },
      { status: 500 },
    )
  }
}
