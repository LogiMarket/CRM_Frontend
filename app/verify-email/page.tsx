"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MessageSquare, Mail, CheckCircle, AlertCircle } from "lucide-react"

function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    // Check if code and email are in URL
    const codeParam = searchParams.get("code")
    const emailParam = searchParams.get("email")

    if (codeParam && emailParam) {
      setCode(codeParam)
      setEmail(emailParam)
      setVerifying(true)
      verifyEmail(codeParam, emailParam)
    }
  }, [searchParams])

  const verifyEmail = async (verificationCode: string, userEmail: string) => {
    try {
      setLoading(true)
      setError("")

      const response = await fetch(
        `/api/auth/verify-email?code=${encodeURIComponent(verificationCode)}&email=${encodeURIComponent(userEmail)}`,
        {
          method: "GET",
        },
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al verificar el email")
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (err) {
      setError("Error al verificar el email. Por favor intenta de nuevo.")
      setLoading(false)
    }
  }

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!code || !email) {
      setError("Por favor ingresa el código y email")
      return
    }

    await verifyEmail(code, email)
  }

  const handleResend = async () => {
    try {
      setLoading(true)
      setError("")

      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al reenviar el correo")
        setLoading(false)
        return
      }

      setError("")
      alert("Email de verificación reenviado a " + email)
      setLoading(false)
    } catch (err) {
      setError("Error al reenviar el correo")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

        <div className="relative z-10 flex flex-col justify-center px-16 text-primary-foreground">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-6">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold mb-4 text-balance">Bienvenido</h1>
            <p className="text-lg text-primary-foreground/90 leading-relaxed text-pretty">
              Verifica tu correo electrónico para completar el registro y acceder a tu cuenta.
            </p>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">Verificar Email</h2>
          </div>

          {success ? (
            // Success message
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">¡Correo verificado!</h2>
                <p className="text-muted-foreground">
                  Tu correo ha sido verificado exitosamente. Serás redirigido al login en unos segundos.
                </p>
              </div>
              <Link href="/login" className="block">
                <Button className="w-full">Ir a login ahora</Button>
              </Link>
            </div>
          ) : verifying && loading ? (
            // Verifying message
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mx-auto">
                <Mail className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Verificando...</h2>
                <p className="text-muted-foreground">Por favor espera mientras verificamos tu correo.</p>
              </div>
            </div>
          ) : (
            // Manual verification form
            <div className="space-y-6">
              <div className="space-y-2 text-center lg:text-left">
                <h2 className="text-3xl font-bold tracking-tight">Verifica tu correo</h2>
                <p className="text-muted-foreground">Ingresa el código de verificación que recibiste en tu correo</p>
              </div>

              <form onSubmit={handleManualVerify} className="space-y-5">
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
                  <Label htmlFor="code" className="text-sm font-medium">
                    Código de verificación
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="Pega el código que recibiste"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 font-mono text-sm tracking-wider"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
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
                    "Verificar correo"
                  )}
                </Button>
              </form>

              <div className="space-y-3 text-center text-sm">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResend}
                  disabled={loading || !email}
                  className="w-full"
                >
                  Reenviar código de verificación
                </Button>

                <div className="text-muted-foreground">
                  ¿Ya tienes cuenta? {""}
                  <Link href="/login" className="text-primary hover:underline font-medium">
                    Inicia sesión
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Cargando...</div>}>
      <VerifyEmailForm />
    </Suspense>
  )
}
