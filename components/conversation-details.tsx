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
  const [currentPriority, setCurrentPriority] = useState(priority)
  const [loading, setLoading] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(false)

  useEffect(() => {
    setCurrentStatus(status)
  }, [status])

  useEffect(() => {
    setCurrentPriority(priority)
  }, [priority])

  useEffect(() => {
    if (!conversationId) return

    const loadComments = async () => {
      setCommentsLoading(true)
      try {
        const response = await fetch(`/api/conversations/${conversationId}`)
        if (response.ok) {
          const data = await response.json()
          setComments(data.comments || "")
        }
      } catch (error) {
        console.error("[ConversationDetails] Error loading comments:", error)
      } finally {
        setCommentsLoading(false)
      }
    }

    loadComments()
  }, [conversationId])
  
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

  const handlePriorityChange = async (newPriority: string) => {
    if (!conversationId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/conversations/${conversationId}/priority`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      })

      if (response.ok) {
        setCurrentPriority(newPriority)
        onUpdate?.()
      }
    } catch (error) {
      console.error("[ConversationDetails] Error updating priority:", error)
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

              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">Prioridad:</span>
                <Select value={currentPriority} onValueChange={handlePriorityChange} disabled={loading}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
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
                  <div className="text-xs text-foreground whitespace-pre-wrap break-words space-y-1">
                    {comments.split("\n").map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              )}
              
              <Textarea
                placeholder="Agregar comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="resize-none h-20 text-xs"
                disabled={loading || commentsLoading}
              />

              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || loading || commentsLoading}
                size="sm"
                className="w-full gap-2"
              >
                <CheckCircle className="h-3 w-3" />
                {loading || commentsLoading ? "Guardando..." : "Guardar Comentario"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
