"use client"

import { useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { useConversations } from "@/hooks/use-conversations"
import { RefreshCw } from "lucide-react"

interface Conversation {
  id: string
  contact_name: string
  phone_number: string
  contact_avatar?: string
  last_message: string
  last_message_at: string
  unread_count: number
  status: string
  priority: string
  agent_name?: string
}

interface ConversationListProps {
  selectedId?: string
  onSelectConversation: (id: string) => void
  onlyAssigned?: boolean
}

export function ConversationList({ selectedId, onSelectConversation, onlyAssigned }: ConversationListProps) {
  const { conversations: backendConversations, loading, refreshing, error } = useConversations(onlyAssigned)
  
  // Transform backend data to component format
  const conversations = backendConversations.map(conv => ({
    id: String(conv.id),
    contact_name: conv.customer_name,
    phone_number: conv.customer_phone,
    contact_avatar: undefined,
    last_message: conv.last_message?.content || "Sin mensajes",
    last_message_at: conv.last_message?.created_at || conv.created_at,
    unread_count: conv.unread_count,
    status: conv.status,
    priority: conv.priority,
    agent_name: undefined, // TODO: fetch from assigned_agent_id
  }))

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800"
      case "medium":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800"
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800"
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700"
      default:
        return "bg-muted text-foreground border-border"
    }
  }

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      "high": "Alta",
      "medium": "Media",
      "normal": "Normal",
      "low": "Baja",
    }
    return labels[priority] || priority
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando conversaciones...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-red-500 text-sm text-center">{error}</p>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-muted-foreground text-sm text-center">No hay conversaciones</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Refresh banner omitido para evitar parpadeo visible */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            className={cn(
              "w-full rounded-lg p-3 text-left transition-all duration-200",
              "hover:bg-accent/80 hover:shadow-md border border-transparent hover:border-border",
              selectedId === conv.id && "bg-primary/10 border-primary/30 shadow-sm",
            )}
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 flex-shrink-0 transition-transform duration-200 hover:scale-105">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {getInitials(conv.contact_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-semibold text-sm text-foreground">{conv.contact_name}</h3>
                  <span className="flex-shrink-0 text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
                <p className="truncate text-muted-foreground text-sm mt-0.5">{conv.last_message || "Sin mensajes"}</p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {conv.unread_count > 0 && (
                    <Badge variant="default" className="h-5 rounded-full px-2 text-xs font-semibold">
                      {conv.unread_count}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 rounded-full px-2 text-xs font-semibold border",
                      getPriorityColor(conv.priority),
                    )}
                  >
                    {getPriorityLabel(conv.priority)}
                  </Badge>
                  {conv.agent_name && (
                    <span className="truncate text-foreground text-xs font-medium">👤 {conv.agent_name}</span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
      </ScrollArea>
    </div>
  )
}
