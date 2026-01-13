"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Mail } from "lucide-react"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const message = searchParams.get("message")
    if (message === "signup-success") {
      setSuccess("¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.")
    }
  }, [searchParams])

  const fillDemoCredentials = () => {
    setEmail("admin@demo.com")
    setPassword("demo123")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Call backend NestJS instead of frontend endpoint
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Login failed")
        setLoading(false)
        return
      }

      // Store token and redirect
      localStorage.setItem("access_token", data.access_token)
      setLoading(false)
      router.push("/inbox")
    } catch (err) {
      console.error("Login error:", err)
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-accent relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <div className="mb-8 animate-fade-in">
              <Image
                src="/logimarket-logo.png"
                alt="LogiMarket"
                width={300}
                height={80}
                className="h-auto w-72 mb-6 drop-shadow-lg"
                priority
              />
            </div>
            <h1 className="text-4xl font-bold mb-4 text-balance animate-fade-in-up">CRM de Whatshapp - Ecommerce</h1>
            <p className="text-lg text-white/90 leading-relaxed text-pretty animate-fade-in-up delay-100">
              Gestiona conversaciones, órdenes y asignaciones de tu equipo en un solo lugar. Mensajería y logística
              especializada en e-commerce.
            </p>
          </div>

          <div className="space-y-4 mt-8">
            <div className="flex items-start gap-3 animate-fade-in-left delay-200">
              <div className="w-2 h-2 rounded-full bg-white mt-2" />
              <div>
                <h3 className="font-semibold mb-1 text-white">Chat en tiempo real</h3>
                <p className="text-sm text-white/80">Responde a tus clientes al instante con una interfaz fluida</p>
              </div>
            </div>
            <div className="flex items-start gap-3 animate-fade-in-left delay-300">
              <div className="w-2 h-2 rounded-full bg-white mt-2" />
              <div>
                <h3 className="font-semibold mb-1 text-white">Gestión de órdenes</h3>
                <p className="text-sm text-white/80">Consulta información de pedidos mientras atiendes al cliente</p>
              </div>
            </div>
            <div className="flex items-start gap-3 animate-fade-in-left delay-400">
              <div className="w-2 h-2 rounded-full bg-white mt-2" />
              <div>
                <h3 className="font-semibold mb-1 text-white">Macros y respuestas rápidas</h3>
                <p className="text-sm text-white/80">Ahorra tiempo con plantillas de respuestas predefinidas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-8">
            <Image
              src="/logimarket-logo.png"
              alt="LogiMarket"
              width={200}
              height={60}
              className="h-auto w-48 mx-auto mb-4"
            />
            <h2 className="text-xl font-bold text-muted-foreground">CRM de Whatshapp - Ecommerce</h2>
          </div>

          <div className="space-y-6">
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-3xl font-bold tracking-tight">Bienvenido de nuevo</h2>
              <p className="text-muted-foreground">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Contraseña
                  </Label>
                  <button type="button" className="text-xs text-primary hover:underline">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              {success && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800 flex items-start gap-2">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{success}</span>
                </div>
              )}

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
                    Verificando...
                  </div>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">O conecta tu base de datos</span>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-2">Mensajería y logística especializada en eCommerce</p>
              <p className="text-xs">
                Si vendes por internet, seremos tus mejores aliados para distribuir y entregar tus productos en la puerta de tus clientes.
              </p>
            </div>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">¿No tienes cuenta? </span>
              <Link href="/signup" className="text-primary hover:underline font-medium">
                Regístrate aquí
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  )
}
