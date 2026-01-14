"use client"

import { useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Info, MessageSquare, CheckCircle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ConversationDetailsProps {
  conversationId?: string | number
  status?: string
  priority?: string
  agent_name?: string
  created_at?: string
  last_message_at?: string
  contact_name?: string
  phone_number?: string
  onUpdate?: () => void
}

export function ConversationDetails({
  conversationId,
  status = "open",
  priority = "medium",
  agent_name,
  created_at,
  last_message_at,
  contact_name,
  phone_number,
  onUpdate,
}: ConversationDetailsProps) {
  const [comments, setComments] = useState("")
  const [newComment, setNewComment] = useState("")
  const [currentStatus, setCurrentStatus] = useState(status)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setCurrentStatus(status)
  }, [status])

  const handleStatusChange = async (newStatus: string) => {
    if (!conversationId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/conversations/${conversationId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setCurrentStatus(newStatus)
        onUpdate?.()
      }
    } catch (error) {
      console.error("[ConversationDetails] Error updating status:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !conversationId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/conversations/${conversationId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment }),
      })

      if (response.ok) {
        setComments((prev) => `${prev}\n${newComment}`)
        setNewComment("")
        onUpdate?.()
      }
    } catch (error) {
      console.error("[ConversationDetails] Error adding comment:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm text-foreground">Detalles de la Conversación</h2>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* Contact Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{contact_name || "Contacto"}</CardTitle>
              <CardDescription className="text-xs">{phone_number || "Sin número"}</CardDescription>
            </CardHeader>
          </Card>

          {/* Status and Priority */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium">Estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={currentStatus} onValueChange={handleStatusChange} disabled={loading}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Abierta</SelectItem>
                  <SelectItem value="assigned">Asignada</SelectItem>
                  <SelectItem value="resolved">Resuelta</SelectItem>
                  <SelectItem value="closed">Cerrada</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Prioridad:</span>
                <Badge className="capitalize">{priority}</Badge>
              </div>

              {agent_name && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Agente:</span>
                  <span className="font-medium">{agent_name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Iniciada:</span>
                <span>
                  {created_at ? format(new Date(created_at), "dd MMM HH:mm", { locale: es }) : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Último mensaje:</span>
                <span>
                  {last_message_at ? format(new Date(last_message_at), "dd MMM HH:mm", { locale: es }) : "-"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Comentarios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {comments && (
                <div className="rounded-md bg-muted p-2">
                  <p className="text-xs text-foreground whitespace-pre-wrap break-words">{comments}</p>
                </div>
              )}
              
              <Textarea
                placeholder="Agregar comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="resize-none h-20 text-xs"
                disabled={loading}
              />

              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || loading}
                size="sm"
                className="w-full gap-2"
              >
                <CheckCircle className="h-3 w-3" />
                {loading ? "Guardando..." : "Guardar Comentario"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
