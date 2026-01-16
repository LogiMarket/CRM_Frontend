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
import { Info, MessageSquare, CheckCircle, Trash2, Edit2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Comment {
  id: string
  text: string
  created_at: string
}

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
  onAgentChange?: (agentId: string, agentName: string) => void
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
  onAgentChange,
}: ConversationDetailsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [currentStatus, setCurrentStatus] = useState(status)
  const [currentPriority, setCurrentPriority] = useState(priority)
  const [currentAgentName, setCurrentAgentName] = useState(agent_name)
  const [loading, setLoading] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")

  useEffect(() => {
    setCurrentStatus(status)
  }, [status])

  useEffect(() => {
    setCurrentPriority(priority)
  }, [priority])

  useEffect(() => {
    setCurrentAgentName(agent_name)
  }, [agent_name])

  useEffect(() => {
    if (!conversationId) return

    const loadComments = async () => {
      setCommentsLoading(true)
      try {
        const response = await fetch(`/api/conversations/${conversationId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.comments) {
            try {
              const parsed = JSON.parse(data.comments)
              setComments(Array.isArray(parsed) ? parsed : [])
            } catch {
              // Old format - plain text, convert to empty array
              setComments([])
            }
          } else {
            setComments([])
          }
        }
      } catch (error) {
        console.error("[ConversationDetails] Error loading comments:", error)
      } finally {
        setCommentsLoading(false)
      }
    }

    loadComments()
  }, [conversationId])
  
  const getStatusColor = (stat: string) => {
    switch (stat) {
      case 'open':
        return 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700'
      case 'assigned':
        return 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-300 dark:border-yellow-700'
      case 'resolved':
        return 'bg-green-50 dark:bg-green-950/40 border-green-300 dark:border-green-700'
      case 'closed':
        return 'bg-gray-50 dark:bg-gray-950/40 border-gray-300 dark:border-gray-700'
      default:
        return 'bg-card border-border'
    }
  }

  const getStatusBadgeColor = (stat: string) => {
    switch (stat) {
      case 'open':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 border-blue-300'
      case 'assigned':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 border-yellow-300'
      case 'resolved':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 border-green-300'
      case 'closed':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (stat: string) => {
    switch (stat) {
      case 'open': return '🔵'
      case 'assigned': return '🟡'
      case 'resolved': return '🟢'
      case 'closed': return '⚫'
      default: return '•'
    }
  }

  const getStatusLabel = (stat: string) => {
    const labels: Record<string, string> = {
      'open': 'Abierta',
      'assigned': 'Asignada',
      'resolved': 'Resuelta',
      'closed': 'Cerrada'
    }
    return labels[stat] || stat
  }

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
        const data = await response.json()
        setComments(data.comments)
        setNewComment("")
        onUpdate?.()
      }
    } catch (error) {
      console.error("[ConversationDetails] Error adding comment:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!conversationId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/conversations/${conversationId}/comments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      })

      if (response.ok) {
        const data = await response.json()
        setComments(data.comments)
        onUpdate?.()
      }
    } catch (error) {
      console.error("[ConversationDetails] Error deleting comment:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editingText.trim() || !conversationId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/conversations/${conversationId}/comments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, text: editingText }),
      })

      if (response.ok) {
        const data = await response.json()
        setComments(data.comments)
        setEditingCommentId(null)
        setEditingText("")
        onUpdate?.()
      }
    } catch (error) {
      console.error("[ConversationDetails] Error editing comment:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAgentUpdate = (agentId: string, agentName: string) => {
    setCurrentAgentName(agentName)
    onAgentChange?.(agentId, agentName)
  }

  return (
    <div className="flex h-full flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="border-b border-border bg-card p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-xs sm:text-sm text-foreground">Detalles de la Conversación</h2>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="space-y-1.5 sm:space-y-3 p-2 sm:p-3 pb-8">
          {/* Contact Info */}
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/10">
            <CardHeader className="pb-1 pt-2 px-2 sm:px-3">
              <CardTitle className="text-xs flex items-center gap-1 truncate">
                <span>📱</span> <span className="truncate">{contact_name || "Contacto"}</span>
              </CardTitle>
              <CardDescription className="text-xs text-blue-700 dark:text-blue-300 truncate">
                {contact_name && phone_number ? `${contact_name} ${phone_number}` : phone_number || "Sin número"}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Status Section */}
          <Card className={`border-l-4 ${getStatusColor(currentStatus)} shadow-sm hover:shadow-md transition-shadow`}>
            <CardHeader className="pb-1 pt-2 px-2 sm:px-3">
              <div className="flex items-center justify-between gap-1">
                <CardTitle className="text-xs font-bold flex items-center gap-1 truncate">
                  <span>{getStatusIcon(currentStatus)}</span>
                  Estado
                </CardTitle>
                <Badge className={`${getStatusBadgeColor(currentStatus)} border text-xs`}>
                  {getStatusLabel(currentStatus)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 px-2 sm:px-3 pb-2">
              <Select value={currentStatus} onValueChange={handleStatusChange} disabled={loading}>
                <SelectTrigger className="h-8 text-xs shadow-sm hover:shadow-md transition-shadow">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <span className="flex items-center gap-2">🔵 Activa</span>
                  </SelectItem>
                  <SelectItem value="resolved">
                    <span className="flex items-center gap-2">🟢 Resuelta</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Priority */}
          <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-1 pt-2 px-2 sm:px-3">
              <CardTitle className="text-xs font-bold flex items-center gap-1">
                <span>⚡</span> Prioridad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-2 sm:px-3 pb-2">
              <Select value={currentPriority} onValueChange={handlePriorityChange} disabled={loading}>
                <SelectTrigger className="h-8 text-xs shadow-sm hover:shadow-md transition-shadow">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🔵 Baja</SelectItem>
                  <SelectItem value="medium">🟡 Media</SelectItem>
                  <SelectItem value="high">🔴 Alta</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Agent Info */}
          {currentAgentName && (
            <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/30 dark:to-purple-950/10">
              <CardHeader className="pb-1 pt-2 px-2 sm:px-3">
                <CardTitle className="text-xs font-bold flex items-center gap-1">
                  <span>👤</span> Agente
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-3 pb-2">
                <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 truncate">
                  {currentAgentName}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card className="border-l-4 border-l-gray-400 shadow-sm">
            <CardHeader className="pb-1 pt-2 px-2 sm:px-3">
              <CardTitle className="text-xs font-bold flex items-center gap-1">
                <span>📅</span> Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5 text-xs px-2 sm:px-3 pb-2">
              {created_at && (
                <div className="flex justify-between gap-1">
                  <span className="text-muted-foreground truncate">Creada:</span>
                  <span className="font-medium text-right text-xs">
                    {format(new Date(created_at), "dd MMM", { locale: es })}
                  </span>
                </div>
              )}
              {last_message_at && (
                <div className="flex justify-between gap-1">
                  <span className="text-muted-foreground truncate">Último:</span>
                  <span className="font-medium text-right text-xs">
                    {format(new Date(last_message_at), "dd MMM", { locale: es })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card className="border-l-4 border-l-indigo-500 shadow-sm">
            <CardHeader className="pb-2 pt-2 px-2 sm:px-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1">
                <span>💬</span> Comentarios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-2 sm:px-3 pb-2">
              {comments.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto rounded-md border border-border p-2 bg-muted/50">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="bg-background p-2 rounded border border-border text-xs space-y-1"
                    >
                      {editingCommentId === comment.id ? (
                        <>
                          <Textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="resize-none h-16 text-xs"
                            disabled={loading}
                          />
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingCommentId(null)
                                setEditingText("")
                              }}
                              disabled={loading}
                              className="h-7 text-xs"
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleEditComment(comment.id)}
                              disabled={!editingText.trim() || loading}
                              className="h-7 text-xs"
                            >
                              Guardar
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-foreground break-words">{comment.text}</p>
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-muted-foreground text-xs">
                              {format(new Date(comment.created_at), "dd MMM HH:mm", { locale: es })}
                            </span>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingCommentId(comment.id)
                                  setEditingText(comment.text)
                                }}
                                disabled={loading}
                                className="h-6 w-6 p-0"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteComment(comment.id)}
                                disabled={loading}
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <Textarea
                placeholder="Escribe un comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="resize-none h-20 text-sm"
                disabled={loading || commentsLoading || editingCommentId !== null}
              />

              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || loading || commentsLoading || editingCommentId !== null}
                size="sm"
                className="w-full gap-1 text-sm h-9"
              >
                <CheckCircle className="h-3 w-3" />
                {loading || commentsLoading ? "Guardando..." : "Guardar"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
