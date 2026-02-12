import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { sql, isDemoMode } from "@/lib/db"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { sendVerificationEmail } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    // Validar entrada
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 },
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato de email inválido" },
        { status: 400 },
      )
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 },
      )
    }

    // En modo demo
    if (isDemoMode) {
      const token = jwt.sign(
        { email, sub: Math.random().toString() },
        process.env.JWT_SECRET || "demo-secret",
        { expiresIn: process.env.JWT_EXPIRATION || "7d" },
      )

      return NextResponse.json(
        {
          message: "Usuario creado exitosamente (modo demo)",
          access_token: token,
          token_type: "Bearer",
          expires_in: process.env.JWT_EXPIRATION || "7d",
          user: {
            id: Math.random().toString(),
            email,
            name: name || "Usuario",
            role: "agent",
            status: "available",
            email_verified: true,
          },
          requiresVerification: false,
        },
        { status: 201 },
      )
    }

    if (!sql) {
      return NextResponse.json(
        {
          error: "Base de datos no configurada. Establece la variable DATABASE_URL.",
        },
        { status: 500 },
      )
    }

    // Verificar si el usuario ya existe
    const existingUser = await sql`
      SELECT id, email FROM users WHERE email = ${email}
    `

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 409 },
      )
    }

    // Hash de la contraseña
    const passwordHash = await hash(password, 10)

    // Generar código de verificación
    const verificationCode = crypto.randomBytes(32).toString("hex")
    const verificationCodeHash = await hash(verificationCode, 10)

    // Crear usuario con email sin verificar
    const result = await sql`
      INSERT INTO users (email, password_hash, name, role, status, email_verified, verification_code)
      VALUES (${email}, ${passwordHash}, ${name || email.split("@")[0]}, 'agent', 'available', false, ${verificationCodeHash})
      RETURNING id, email, name, role, status, email_verified
    `

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: "Error al crear el usuario" },
        { status: 500 },
      )
    }

    const user = result[0]

    // Generar enlace de verificación
    const verificationLink = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/verify-email?code=${verificationCode}&email=${encodeURIComponent(email)}`

    // Enviar email de verificación
    const emailSent = await sendVerificationEmail(
      email,
      user.name,
      verificationCode,
      verificationLink,
    )

    // Generar token JWT (pero marcar que necesita verificar email)
    const token = jwt.sign(
      { email: user.email, sub: user.id, emailVerified: false },
      process.env.JWT_SECRET || "secret",
      { expiresIn: process.env.JWT_EXPIRATION || "7d" },
    )

    return NextResponse.json(
      {
        message: emailSent
          ? "Usuario creado exitosamente. Verifica tu correo para completar el registro."
          : "Usuario creado, pero no pudimos enviar el email de verificación.",
        access_token: token,
        token_type: "Bearer",
        expires_in: process.env.JWT_EXPIRATION || "7d",
        user,
        requiresVerification: true,
        emailSent,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Signup error:", error)

    if (error instanceof Error) {
      if (error.message.includes("relation") && error.message.includes("does not exist")) {
        return NextResponse.json(
          {
            error: "La base de datos no está inicializada. Ejecuta los scripts SQL.",
          },
          { status: 500 },
        )
      }

      if (error.message.includes("connect")) {
        return NextResponse.json(
          {
            error: "No se puede conectar a la base de datos. Verifica DATABASE_URL.",
          },
          { status: 500 },
        )
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
