"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, MoreVertical, Phone, Video } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { MacrosDialog } from "./macros-dialog"
import { AssignAgentDialog } from "./assign-agent-dialog"

interface Message {
  id: number
  content: string
  sender_type: string
  sender_name: string
  created_at: string
}

interface ChatAreaProps {
  conversationId?: number | string
  contactName?: string
  currentAgentId?: number | string
  onUpdate?: () => void
}

export function ChatArea({ conversationId, contactName, currentAgentId, onUpdate }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (conversationId) {
      fetchMessages()

      // Silent polling for new messages every 5s
      const intervalId = setInterval(() => fetchMessages(), 5000)
      return () => clearInterval(intervalId)
    }
  }, [conversationId])

  // Auto-scroll al bottom cuando hay nuevos mensajes
  useEffect(() => {
    if (messages.length > 0) {
      // Scroll al bottom cuando hay mensajes
      setTimeout(() => {
        const scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight
        }
      }, 100)
    }
  }, [messages])

  const scrollToBottom = () => {
    setTimeout(() => {
      const scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }, 100)
  }

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
    if (!newMessage.trim() || !conversationId || sending) return

    const messageContent = newMessage
    setSending(true)
    setNewMessage("") // Clear input immediately for better UX
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent }),
      })

      if (!response.ok) {
        console.error("[ChatArea] Send message error:", response.status, response.statusText)
        // Restore message if sending failed
        setNewMessage(messageContent)
        return
      }

      const data = await response.json()
      if (data.message) {
        // Agregar nuevo mensaje al final (ya que están en orden ascendente)
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
    } catch (error) {
      console.error("[ChatArea] Send message error:", error)
      // Restore message if sending failed
      setNewMessage(messageContent)
    } finally {
      setSending(false)
    }
  }

  const handleMacroSelect = async (content: string, macroId: number) => {
    setNewMessage(content)
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
              {contactName ? getInitials(contactName) : "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-sm text-foreground">{contactName || "Contacto"}</h2>
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
          <Button variant="ghost" size="icon" className="hover:bg-accent transition-colors">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-accent transition-colors">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-accent transition-colors">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 overflow-hidden" ref={scrollRef}>
        <div className="space-y-4 p-6 pb-24">
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
                  className={cn("flex gap-3 animate-fade-in-up", msg.sender_type === "agent" && "flex-row-reverse")}
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
                  <div className={cn("max-w-[70%] space-y-1", msg.sender_type === "agent" && "items-end")}>
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2 shadow-sm transition-all hover:shadow-md",
                        msg.sender_type === "agent"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-foreground border border-border",
                      )}
                    >
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                    {showTimestamp && (
                      <p className="text-muted-foreground text-xs px-1">
                        {currentTime}
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t border-border bg-card p-4 sticky bottom-0">
        <div className="mb-2 flex gap-2">
          <MacrosDialog onSelectMacro={handleMacroSelect} />
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            disabled={sending}
            className="flex-1 transition-all focus:ring-2 focus:ring-primary"
          />
          <Button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="transition-all hover:scale-105 active:scale-95"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
