"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Phone, Video, Calendar, Clock, Trash2, CheckCircle, Search } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Call {
  id: string
  contact_name: string
  phone_number: string
  scheduled_at: string
  call_type: "phone" | "video"
  notes?: string
  status: "pending" | "completed" | "cancelled"
}

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchCalls()
  }, [])

  const fetchCalls = async () => {
    try {
      const response = await fetch("/api/calls")
      const data = await response.json()
      setCalls(data.calls || [])
    } catch (error) {
      console.error("Error fetching calls:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCalls = calls.filter(
    (call) =>
      call.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.phone_number.includes(searchTerm)
  )

  const pendingCalls = filteredCalls.filter((call) => call.status === "pending")
  const completedCalls = filteredCalls.filter((call) => call.status === "completed")

  const handleMarkComplete = async (id: string) => {
    try {
      await fetch(`/api/calls/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      })
      fetchCalls()
    } catch (error) {
      console.error("Error updating call:", error)
    }
  }

  const handleDeleteCall = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta llamada?")) return

    try {
      await fetch(`/api/calls/${id}`, {
        method: "DELETE",
      })
      fetchCalls()
    } catch (error) {
      console.error("Error deleting call:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Cargando llamadas...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Phone className="h-6 w-6" />
              Gestión de Llamadas
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Administra y agenda llamadas con tus contactos
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Pending Calls */}
          {pendingCalls.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold">
                  Llamadas Próximas ({pendingCalls.length})
                </h2>
              </div>

              <div className="grid gap-3">
                {pendingCalls.map((call) => (
                  <Card key={call.id} className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-sm flex items-center gap-2">
                            {call.call_type === "video" ? (
                              <Video className="h-4 w-4 text-purple-500" />
                            ) : (
                              <Phone className="h-4 w-4 text-green-500" />
                            )}
                            {call.contact_name}
                          </CardTitle>
                          <CardDescription className="text-xs mt-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <span>📱</span>
                              <span>{call.phone_number}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>
                                {format(new Date(call.scheduled_at), "EEEE, dd 'de' MMMM 'a las' HH:mm", {
                                  locale: es,
                                })}
                              </span>
                            </div>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    {call.notes && (
                      <CardContent className="pb-3 pt-0">
                        <div className="bg-muted/50 p-2 rounded text-xs text-muted-foreground">
                          {call.notes}
                        </div>
                      </CardContent>
                    )}

                    <CardContent className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleMarkComplete(call.id)}
                        className="flex-1 h-8 text-xs"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Marcar Completada
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCall(call.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Completed Calls */}
          {completedCalls.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h2 className="text-lg font-semibold">
                  Llamadas Completadas ({completedCalls.length})
                </h2>
              </div>

              <div className="grid gap-3">
                {completedCalls.map((call) => (
                  <Card key={call.id} className="border-l-4 border-l-green-500 opacity-75">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                            {call.call_type === "video" ? (
                              <Video className="h-4 w-4" />
                            ) : (
                              <Phone className="h-4 w-4" />
                            )}
                            {call.contact_name}
                          </CardTitle>
                          <CardDescription className="text-xs mt-2">
                            <span>
                              {format(new Date(call.scheduled_at), "dd MMM HH:mm", {
                                locale: es,
                              })}
                            </span>
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">Completada</Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {filteredCalls.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-center">
                {searchTerm ? "No se encontraron llamadas" : "No hay llamadas agendadas"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
