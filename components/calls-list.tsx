"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, Video, Trash2, CheckCircle, Clock } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ScheduledCall {
  id: string
  contact_name: string
  phone_number: string
  scheduled_at: string
  call_type: "phone" | "video"
  notes?: string
  status: "pending" | "completed" | "cancelled"
}

interface CallsListProps {
  conversationId?: string | number
}

export function CallsList({ conversationId }: CallsListProps) {
  const [calls, setCalls] = useState<ScheduledCall[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetchCalls()
  }, [conversationId])

  const fetchCalls = async () => {
    try {
      const url = conversationId
        ? `/api/calls?conversation_id=${conversationId}`
        : "/api/calls"
      const response = await fetch(url)
      const data = await response.json()
      setCalls(data.calls || [])
    } catch (error) {
      console.error("Error fetching calls:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCall = async (id: string) => {
    try {
      const response = await fetch(`/api/calls/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setCalls(calls.filter((call) => call.id !== id))
        setDeleteId(null)
      }
    } catch (error) {
      console.error("Error deleting call:", error)
    }
  }

  const handleMarkComplete = async (id: string) => {
    try {
      const response = await fetch(`/api/calls/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      })

      if (response.ok) {
        setCalls(
          calls.map((call) =>
            call.id === id ? { ...call, status: "completed" } : call
          )
        )
      }
    } catch (error) {
      console.error("Error updating call:", error)
    }
  }

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Cargando llamadas...</div>
  }

  if (calls.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No hay llamadas agendadas</p>
      </div>
    )
  }

  const upcomingCalls = calls.filter((call) => call.status === "pending")
  const completedCalls = calls.filter((call) => call.status === "completed")

  return (
    <div className="space-y-6">
      {/* Upcoming Calls */}
      {upcomingCalls.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Llamadas Próximas
          </h3>
          <div className="space-y-2">
            {upcomingCalls.map((call) => (
              <Card key={call.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2 pt-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {call.call_type === "video" ? (
                          <Video className="h-4 w-4" />
                        ) : (
                          <Phone className="h-4 w-4" />
                        )}
                        {call.contact_name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {call.phone_number}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0">
                      {format(new Date(call.scheduled_at), "dd MMM HH:mm", {
                        locale: es,
                      })}
                    </Badge>
                  </div>
                </CardHeader>
                {call.notes && (
                  <CardContent className="text-xs text-muted-foreground pb-2">
                    {call.notes}
                  </CardContent>
                )}
                <CardContent className="pb-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkComplete(call.id)}
                      className="flex-1 h-8 text-xs"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completada
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(call.id)}
                      className="h-8 text-destructive hover:text-destructive w-8 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Calls */}
      {completedCalls.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Llamadas Completadas
          </h3>
          <div className="space-y-2">
            {completedCalls.map((call) => (
              <Card key={call.id} className="border-l-4 border-l-green-500 opacity-75">
                <CardHeader className="pb-2 pt-2">
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
                      <CardDescription className="text-xs mt-1">
                        {call.phone_number}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0 text-xs">
                      {format(new Date(call.scheduled_at), "dd MMM HH:mm", {
                        locale: es,
                      })}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar llamada</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar esta llamada agendada?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDeleteCall(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
