"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Send, MoreVertical, Phone, Video, Edit2, Trash2, Paperclip } from "lucide-react"
import { cn, formatContactDisplayName, getContactAvatarText } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "@/hooks/use-toast"
import { MacrosDialog } from "./macros-dialog"
import { AssignAgentDialog } from "./assign-agent-dialog"
import { ScheduleCallDialog } from "./schedule-call-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Message {
  id: number | string
  content: string
  sender_type: string
  sender_name: string
  created_at: string
  message_type?: string
  metadata?: any
  media_url?: string | null
}

interface ChatAreaProps {
  conversationId?: number | string
  contactName?: string
  currentAgentId?: number | string
  channel?: string // 'whatsapp', 'facebook', etc
  externalUserId?: string // PSID for Facebook, phone for WhatsApp
  onUpdate?: () => void
  onConversationDeleted?: () => void
}

export function ChatArea({ conversationId, contactName, currentAgentId, channel = 'whatsapp', externalUserId, onUpdate, onConversationDeleted }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendingMedia, setSendingMedia] = useState(false)
  const [resolvedContactName, setResolvedContactName] = useState<string | undefined>(contactName)
  const [deleteConversationOpen, setDeleteConversationOpen] = useState(false)
  const [deletingConversation, setDeletingConversation] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<number | string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [scheduleCallOpen, setScheduleCallOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayContactName = formatContactDisplayName(resolvedContactName || contactName, channel)

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    }
  }, [pendingPreviewUrl])

  useEffect(() => {
    if (conversationId) {
      fetchMessages()

      // Silent polling for new messages every 5s
      const intervalId = setInterval(() => fetchMessages(), 5000)
      return () => clearInterval(intervalId)
    }
  }, [conversationId])

  useEffect(() => {
    setResolvedContactName(contactName)
  }, [contactName])

  useEffect(() => {
    const shouldResolve = (value: string | undefined) => {
      const v = String(value || "").trim()
      if (!v) return true
      return v.toLowerCase().startsWith("whatsapp:+") || v.toLowerCase().startsWith("fb_")
    }

    const resolve = async () => {
      if (!conversationId) return
      if (!shouldResolve(resolvedContactName)) return
      try {
        const res = await fetch(`/api/conversations/${encodeURIComponent(String(conversationId))}`)
        const data = await res.json().catch(() => null)
        const name = data?.contact_name ? String(data.contact_name) : ""
        if (name.trim()) setResolvedContactName(name.trim())
      } catch {
        // ignore
      }
    }

    void resolve()
    // Only when switching conversation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  const handleDeleteConversation = async () => {
    if (!conversationId) return

    try {
      setDeletingConversation(true)
      const res = await fetch(`/api/conversations/${encodeURIComponent(String(conversationId))}`, {
        method: "DELETE",
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message = data?.error || "No se pudo eliminar la conversación"
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Conversación eliminada",
        description: "Se eliminó correctamente.",
      })

      setDeleteConversationOpen(false)
      onConversationDeleted?.()
      onUpdate?.()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo eliminar la conversación",
        variant: "destructive",
      })
    } finally {
      setDeletingConversation(false)
    }
  }

  // Auto-scroll al bottom cuando hay nuevos mensajes
  useEffect(() => {
    if (messages.length > 0) {
      // Scroll al bottom cuando hay mensajes
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 50)
    }
  }, [messages])

  const fetchMessages = async () => {
    if (!conversationId) return

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`)
      const data = await response.json()
      
      if (!response.ok) {
        console.error("[ChatArea] Fetch messages error:", response.status, data)
        return
      }
      
      // Ordenar por fecha ascendente (más viejos primero, más recientes último)
      const sortedMessages = (data.messages || []).sort((a: Message, b: Message) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
      setMessages(sortedMessages)
    } catch (error) {
      console.error("[ChatArea] Fetch messages error:", error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conversationId || sending || sendingMedia) return

    const hasText = Boolean(newMessage.trim())
    const hasFile = Boolean(pendingFile)
    if (!hasText && !hasFile) return

    // If there is a pending attachment, send media. Text becomes caption.
    if (pendingFile) {
      setSendingMedia(true)
      const fileToSend = pendingFile
      const previewToRevoke = pendingPreviewUrl
      const caption = newMessage.trim()

      try {
        const form = new FormData()
        form.append("file", fileToSend)
        if (caption) form.append("caption", caption)

        setPendingFile(null)
        setPendingPreviewUrl(null)
        setNewMessage("")

        const response = await fetch(`/api/conversations/${conversationId}/send-media`, {
          method: "POST",
          body: form,
        })

        const data = await response.json().catch(() => null)
        if (!response.ok) {
          console.error("[ChatArea] Send media error:", response.status, data)

          const detailsMessage =
            data?.error ||
            data?.details?.error?.message ||
            data?.details?.message ||
            (typeof data?.details === "string" ? data.details : null) ||
            response.statusText ||
            "No se pudo enviar el adjunto."

          const hint = data?.hint ? String(data.hint) : ""
          const description = hint ? `${String(detailsMessage)}\n${hint}` : String(detailsMessage)

          toast({
            title: "Error al enviar adjunto",
            description,
            variant: "destructive",
          })

          // Restore pending state for retry
          setPendingFile(fileToSend)
          if (previewToRevoke) setPendingPreviewUrl(previewToRevoke)
          setNewMessage(caption)
          return
        }

        if (data?.message) {
          const msg = data.message
          setMessages([
            ...messages,
            {
              id: msg.id,
              content: msg.content,
              sender_type: msg.sender_type || "agent",
              sender_name: msg.sender_name || "Agent",
              created_at: msg.created_at || new Date().toISOString(),
              message_type: msg.message_type,
              metadata: msg.metadata,
              media_url: msg.media_url,
            },
          ])
        } else {
          await fetchMessages()
        }
      } catch (error) {
        console.error("[ChatArea] Send media error:", error)

        toast({
          title: "Error al enviar adjunto",
          description: "Ocurrió un error inesperado al enviar el archivo.",
          variant: "destructive",
        })

        // Restore pending state for retry
        setPendingFile(fileToSend)
        if (previewToRevoke) setPendingPreviewUrl(previewToRevoke)
        setNewMessage(caption)
      } finally {
        if (previewToRevoke) {
          try { URL.revokeObjectURL(previewToRevoke) } catch {}
        }
        setSendingMedia(false)
      }
      return
    }

    const messageContent = newMessage
    setSending(true)
    setNewMessage("") // Clear input immediately for better UX
    
    try {
      // Detectar canal y usar endpoint apropiado
      if (channel === 'facebook' && externalUserId) {
        // Enviar via Facebook Messenger
        const response = await fetch(`/api/facebook/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            recipientId: externalUserId,
            message: messageContent,
            conversationId: conversationId
          }),
        })

        if (!response.ok) {
          console.error("[ChatArea] Facebook send error:", response.status, response.statusText)
          toast({
            title: "Error al enviar mensaje",
            description: "No se pudo enviar el mensaje por Facebook.",
            variant: "destructive",
          })
          setNewMessage(messageContent)
          return
        }

        const data = await response.json()
        // Agregar mensaje al UI
        setMessages([
          ...messages,
          {
            id: data.messageId || Date.now(),
            content: messageContent,
            sender_type: "agent",
            sender_name: "Agent",
            created_at: new Date().toISOString(),
          },
        ])
      } else {
        // Enviar via endpoint normal (WhatsApp u otros)
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: messageContent }),
        })

        if (!response.ok) {
          console.error("[ChatArea] Send message error:", response.status, response.statusText)
          toast({
            title: "Error al enviar mensaje",
            description: "No se pudo enviar el mensaje.",
            variant: "destructive",
          })
          setNewMessage(messageContent)
          return
        }

        const data = await response.json()
        if (data.message) {
          setMessages([
            ...messages,
            {
              id: data.message.id,
              content: data.message.content,
              sender_type: data.message.sender_type || "agent",
              sender_name: data.message.sender_name || "Agent",
              created_at: data.message.created_at || new Date().toISOString(),
            },
          ])
        }
      }
    } catch (error) {
      console.error("[ChatArea] Send message error:", error)
      toast({
        title: "Error al enviar mensaje",
        description: "Ocurrió un error inesperado.",
        variant: "destructive",
      })
      setNewMessage(messageContent)
    } finally {
      setSending(false)
    }
  }

  const handlePickFile = () => {
    if (!conversationId || sending || sendingMedia) return
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !conversationId) return

    // allow selecting the same file again later
    e.target.value = ""

    // Replace previous pending attachment
    if (pendingPreviewUrl) {
      try { URL.revokeObjectURL(pendingPreviewUrl) } catch {}
    }

    setPendingFile(file)
    // Only generate preview for media types the browser can display
    const mime = String(file.type || "").toLowerCase()
    const canPreview = mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/")
    setPendingPreviewUrl(canPreview ? URL.createObjectURL(file) : null)
  }

  const clearPendingAttachment = () => {
    setPendingFile(null)
    if (pendingPreviewUrl) {
      try { URL.revokeObjectURL(pendingPreviewUrl) } catch {}
    }
    setPendingPreviewUrl(null)
  }

  const handleMacroSelect = async (content: string, macroId: number) => {
    setNewMessage(content)
  }

  const handleEditMessage = async (messageId: number | string) => {
    if (!editingContent.trim() || !conversationId) return

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingContent.trim() }),
      })

      if (response.ok) {
        setMessages(
          messages.map((msg) =>
            msg.id === messageId ? { ...msg, content: editingContent.trim() } : msg
          )
        )
        setEditingMessageId(null)
        setEditingContent("")
        onUpdate?.()
      } else {
        console.error("Error editing message:", response.status)
      }
    } catch (error) {
      console.error("Error editing message:", error)
    }
  }

  const handleDeleteMessage = async (messageId: number | string) => {
    if (!conversationId) return

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setMessages(messages.filter((msg) => msg.id !== messageId))
        onUpdate?.()
      } else {
        console.error("Error deleting message:", response.status)
      }
    } catch (error) {
      console.error("Error deleting message:", error)
    }
  }

  const renderMessageBody = (msg: Message) => {
    const type = msg.message_type || "text"
    const mediaUrl = msg.media_url || null
    const filename = msg?.metadata?.filename || msg?.metadata?.media_filename || ""
    const caption = msg?.metadata?.caption || ""

    const isPlaceholderContent = (value: unknown) => {
      const text = String(value || "").trim().toLowerCase()
      return (
        text === "[imagen]" ||
        text === "[sticker]" ||
        text === "[documento]" ||
        text === "[audio]" ||
        text === "[video]" ||
        /^\[[a-z0-9_\- ]+\s+mensaje\]$/.test(text)
      )
    }

    const textToShow = caption || (!isPlaceholderContent(msg.content) ? String(msg.content || "").trim() : "")

    if (!mediaUrl || type === "text") {
      return (
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {msg.content}
        </p>
      )
    }

    if (type === "image" || type === "sticker") {
      return (
        <div className="space-y-2">
          <img
            src={mediaUrl}
            alt={caption || filename || "imagen"}
            className="max-w-full rounded-md border border-border"
            loading="lazy"
          />
          {textToShow && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {textToShow}
            </p>
          )}
        </div>
      )
    }

    if (type === "video") {
      return (
        <div className="space-y-2">
          <video
            src={mediaUrl}
            controls
            className="max-w-full rounded-md border border-border"
          />
          {textToShow && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {textToShow}
            </p>
          )}
        </div>
      )
    }

    if (type === "audio") {
      return (
        <div className="space-y-2">
          <audio src={mediaUrl} controls className="w-full" />
          {textToShow && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {textToShow}
            </p>
          )}
        </div>
      )
    }

    // document or unknown media types: show link
    return (
      <div className="space-y-1">
        <a
          href={mediaUrl}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 text-sm break-words [overflow-wrap:anywhere]"
        >
          {filename || msg.content || "Ver archivo"}
        </a>
        {caption && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {caption}
          </p>
        )}
      </div>
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (!conversationId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">Selecciona una conversación para comenzar</p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Chat Header */}
      <div className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 transition-transform duration-200 hover:scale-105">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {displayContactName ? getContactAvatarText(displayContactName, channel) : "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm text-foreground">{displayContactName || "Contacto"}</h2>
              {/* Channel badge */}
              {channel && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  channel === 'facebook' && "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
                  channel === 'whatsapp' && "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300"
                )}>
                  {channel === 'facebook' && '💬 Facebook'}
                  {channel === 'whatsapp' && '💚 WhatsApp'}
                  {channel !== 'facebook' && channel !== 'whatsapp' && channel}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-sm shadow-blue-500/50" />
              En línea
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversationId && (
            <AssignAgentDialog
              conversationId={conversationId.toString()}
              currentAgentId={currentAgentId?.toString()}
              onAssign={(agentId, agentName) => onUpdate?.()}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-accent transition-colors"
            onClick={() => console.log("Initiate phone call")}
            title="Llamada telefónica"
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-accent transition-colors"
            onClick={() => console.log("Initiate video call")}
            title="Videollamada"
          >
            <Video className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-accent transition-colors">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setScheduleCallOpen(true)}>
                Agendar llamada
              </DropdownMenuItem>
              <DropdownMenuItem>Enviar encuesta</DropdownMenuItem>
              <DropdownMenuItem>Transferir conversación</DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteConversationOpen(true)}
                disabled={!conversationId || deletingConversation}
              >
                Eliminar conversación
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={deleteConversationOpen} onOpenChange={setDeleteConversationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la conversación y sus mensajes. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingConversation}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                void handleDeleteConversation()
              }}
              disabled={deletingConversation}
            >
              {deletingConversation ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule Call Dialog */}
      <ScheduleCallDialog
        open={scheduleCallOpen}
        onOpenChange={setScheduleCallOpen}
        contactName={contactName}
        phoneNumber=""
        conversationId={conversationId}
      />

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/20"
      >
        <div className="flex flex-col justify-end gap-4 p-6 min-h-full">
          {loading ? (
            <p className="text-center text-muted-foreground text-sm">Cargando mensajes...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm">No hay mensajes aún</p>
          ) : (
            messages.map((msg, index) => {
              // Comparar hora con el mensaje anterior
              const prevMsg = index > 0 ? messages[index - 1] : null
              const currentTime = format(new Date(msg.created_at), "dd MMM HH:mm", { locale: es })
              const prevTime = prevMsg ? format(new Date(prevMsg.created_at), "dd MMM HH:mm", { locale: es }) : null
              const showTimestamp = !prevTime || currentTime !== prevTime

              return (
                <div
                  key={msg.id}
                  className={cn("flex gap-3 animate-fade-in-up flex-shrink-0 group", msg.sender_type === "agent" && "flex-row-reverse")}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback
                      className={cn(
                        "font-semibold",
                        msg.sender_type === "agent" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                      )}
                    >
                      {getInitials(msg.sender_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "max-w-[70%] min-w-0 space-y-1 flex flex-col",
                      msg.sender_type === "agent" && "items-end",
                    )}
                  >
                    {editingMessageId === msg.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="min-h-20 text-sm rounded-lg"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingMessageId(null)
                              setEditingContent("")
                            }}
                            className="text-xs h-8"
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleEditMessage(msg.id)}
                            disabled={!editingContent.trim()}
                            className="text-xs h-8"
                          >
                            Guardar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className={cn(
                            "max-w-full rounded-lg px-4 py-2 shadow-sm transition-all hover:shadow-md group-hover:ring-2",
                            msg.sender_type === "agent"
                              ? "bg-primary text-primary-foreground group-hover:ring-primary/50"
                              : "bg-card text-foreground border border-border group-hover:ring-muted-foreground/30",
                          )}
                        >
                          {renderMessageBody(msg)}
                        </div>
                        {showTimestamp && (
                          <p className="text-muted-foreground text-xs px-1">
                            {currentTime}
                          </p>
                        )}
                        {msg.sender_type === "agent" && (
                          <div className={cn("flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity", msg.sender_type === "agent" && "flex-row-reverse")}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingMessageId(msg.id)
                                setEditingContent(msg.content)
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t border-border bg-card p-4 sticky bottom-0">
        <div className="mb-2 flex gap-2">
          <MacrosDialog onSelectMacro={handleMacroSelect} />
        </div>

        {pendingFile && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Adjunto listo para enviar</p>
              <p className="text-sm truncate">{pendingFile.name}</p>
              {pendingPreviewUrl && String(pendingFile.type || "").toLowerCase().startsWith("image/") && (
                <img src={pendingPreviewUrl} alt={pendingFile.name} className="mt-2 max-h-48 rounded-md border border-border" />
              )}
              {pendingPreviewUrl && String(pendingFile.type || "").toLowerCase().startsWith("video/") && (
                <video src={pendingPreviewUrl} controls className="mt-2 max-h-48 rounded-md border border-border" />
              )}
              {pendingPreviewUrl && String(pendingFile.type || "").toLowerCase().startsWith("audio/") && (
                <audio src={pendingPreviewUrl} controls className="mt-2 w-full" />
              )}
            </div>
            <Button type="button" variant="ghost" onClick={clearPendingAttachment} disabled={sending || sendingMedia}>
              Quitar
            </Button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelected}
          />
          <Button
            type="button"
            variant="ghost"
            onClick={handlePickFile}
            disabled={sending || sendingMedia}
            className="shrink-0"
            title="Adjuntar archivo"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={pendingFile ? "Escribe una leyenda (opcional)..." : "Escribe un mensaje..."}
            disabled={sending || sendingMedia}
            className="flex-1 transition-all focus:ring-2 focus:ring-primary"
          />
          <Button
            type="submit"
            disabled={sending || sendingMedia || (!newMessage.trim() && !pendingFile)}
            className="transition-all hover:scale-105 active:scale-95"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
