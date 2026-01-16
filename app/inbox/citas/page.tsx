"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Phone, Plus, Trash2, User, MessageSquare } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ScheduleCallDialog } from "@/components/schedule-call-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Call {
  id: number
  contact_name?: string
  phone_number?: string
  scheduled_at: string
  call_type: string
  notes?: string
  status: string
  conversation_id?: number
  created_at: string
}

export default function CitasPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)

  const fetchCalls = async () => {
    try {
      const response = await fetch("/api/calls")
      if (response.ok) {
        const data = await response.json()
        setCalls(data.calls || [])
      }
    } catch (error) {
      console.error("Error fetching calls:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCalls()
    // Refrescar cada 30 segundos
    const interval = setInterval(fetchCalls, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleDeleteCall = async (callId: number) => {
    if (!confirm("¿Eliminar esta cita?")) return

    try {
      const response = await fetch(`/api/calls/${callId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setCalls(calls.filter((c) => c.id !== callId))
      } else {
        alert("Error al eliminar la cita")
      }
    } catch (error) {
      console.error("Error deleting call:", error)
      alert("Error al eliminar la cita")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500">Pendiente</Badge>
      case "completed":
        return <Badge className="bg-green-500">Completada</Badge>
      case "cancelled":
        return <Badge className="bg-red-500">Cancelada</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const upcomingCalls = calls.filter((c) => new Date(c.scheduled_at) >= new Date() && c.status === "pending")
  const pastCalls = calls.filter((c) => new Date(c.scheduled_at) < new Date() || c.status !== "pending")

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Citas Programadas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona tus llamadas y citas agendadas
          </p>
        </div>
        <Button onClick={() => setShowScheduleDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Cita
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Cargando citas...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Upcoming Calls */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Próximas Citas ({upcomingCalls.length})
              </h2>
              {upcomingCalls.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No hay citas próximas</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {upcomingCalls.map((call) => (
                    <Card key={call.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {call.contact_name || "Sin nombre"}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Phone className="h-3 w-3" />
                              {call.phone_number || "Sin teléfono"}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(call.status)}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCall(call.id)}
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(new Date(call.scheduled_at), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(new Date(call.scheduled_at), "HH:mm", { locale: es })}
                          </span>
                        </div>
                        {call.notes && (
                          <div className="flex items-start gap-2 text-sm mt-3 p-2 bg-muted rounded">
                            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <span className="text-muted-foreground">{call.notes}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Past Calls */}
            {pastCalls.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-500" />
                  Historial ({pastCalls.length})
                </h2>
                <div className="grid gap-3">
                  {pastCalls.slice(0, 10).map((call) => (
                    <Card key={call.id} className="border-l-4 border-l-gray-300 opacity-75">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {call.contact_name || "Sin nombre"}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {call.phone_number || "Sin teléfono"}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(call.status)}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCall(call.id)}
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(call.scheduled_at), "d MMM yyyy, HH:mm", { locale: es })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Schedule Dialog */}
      <ScheduleCallDialog
        open={showScheduleDialog}
        onOpenChange={(open) => {
          setShowScheduleDialog(open)
          if (!open) fetchCalls() // Refresh after closing
        }}
      />
    </div>
  )
}
