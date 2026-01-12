"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MessageSquare, Lock, Mail, User } from "lucide-react"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Signup failed")
        setLoading(false)
        return
      }

      // Check if email verification is required
      if (data.requiresVerification) {
        setVerificationSent(true)
        setLoading(false)
      } else {
        // No verification required (demo mode)
        // Show success message and redirect to login
        setLoading(false)
        router.push("/login?message=signup-success")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - same as login */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

        <div className="relative z-10 flex flex-col justify-center px-16 text-primary-foreground">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-6">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold mb-4 text-balance">Únete al equipo</h1>
            <p className="text-lg text-primary-foreground/90 leading-relaxed text-pretty">
              Crea tu cuenta de agente y comienza a gestionar conversaciones de clientes de manera eficiente.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - signup form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">CRM de Whatshapp - Ecommerce</h2>
          </div>

          {verificationSent ? (
            // Verification message
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mx-auto">
                <Mail className="w-8 h-8" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tight">Verifica tu correo</h2>
                <p className="text-muted-foreground">
                  Hemos enviado un enlace de verificación a{" "}
                  <span className="font-semibold text-foreground">{email}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Por favor revisa tu correo (incluyendo la carpeta de spam) y haz clic en el enlace de verificación.
                </p>
              </div>

              <Button
                onClick={async () => {
                  setLoading(true)
                  try {
                    const response = await fetch("/api/auth/resend-verification", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email }),
                    })

                    const data = await response.json()

                    if (response.ok) {
                      alert("Se ha reenviado el correo de verificación a " + email)
                    } else {
                      setError(data.error || "Error al reenviar el correo")
                    }
                  } catch (err) {
                    setError("Error al reenviar el correo")
                  }
                  setLoading(false)
                }}
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Reenviando..." : "Reenviar correo de verificación"}
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">¿Ya verificaste tu correo? </span>
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Inicia sesión aquí
                </Link>
              </div>
            </div>
          ) : (
            // Signup form
            <div className="space-y-6">
              <div className="space-y-2 text-center lg:text-left">
                <h2 className="text-3xl font-bold tracking-tight">Crear cuenta</h2>
                <p className="text-muted-foreground">Completa el formulario para registrarte como agente</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Nombre completo
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Juan Pérez"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 h-11"
                      minLength={6}
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-start gap-2">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Creando cuenta...
                    </div>
                  ) : (
                    "Crear cuenta"
                  )}
                </Button>
              </form>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">¿Ya tienes cuenta? </span>
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Inicia sesión
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
