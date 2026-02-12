"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn, formatContactDisplayName, getContactAvatarText } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { useConversations } from "@/hooks/use-conversations"

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
  channel?: string
}

interface ConversationListProps {
  selectedId?: string
  onSelectConversation: (id: string) => void
  onlyAssigned?: boolean
}

export function ConversationList({
  selectedId,
  onSelectConversation,
  onlyAssigned,
}: ConversationListProps) {
  const { conversations: backendConversations, loading, error } =
    useConversations(onlyAssigned)

  const conversations: Conversation[] = backendConversations.map((conv) => ({
    id: String(conv.id),
    contact_name: conv.customer_name,
    phone_number: conv.customer_phone,
    contact_avatar: undefined,
    last_message: conv.last_message?.content || "Sin mensajes",
    last_message_at: conv.last_message?.created_at || conv.created_at,
    unread_count: conv.unread_count,
    status: conv.status,
    priority: conv.priority,
    agent_name: undefined,
    channel: conv.channel || "whatsapp",
  }))

  const getDisplayName = (name: string, channel?: string) =>
    formatContactDisplayName(name, channel)

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
      high: "Alta",
      medium: "Media",
      normal: "Normal",
      low: "Baja",
    }
    return labels[priority] || priority
  }

  const getChannelIcon = (channel?: string) => {
    switch (channel) {
      case "facebook":
        return "💬"
      case "whatsapp":
        return "💚"
      case "instagram":
        return "📷"
      default:
        return "💬"
    }
  }

  const getChannelColor = (channel?: string) => {
    switch (channel) {
      case "facebook":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
      case "whatsapp":
        return "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300"
      case "instagram":
        return "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  if (loading) {
    return (
      <div className="h-full p-3">
        <div className="h-full rounded-xl border bg-card shadow-sm flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Cargando conversaciones...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full p-3">
        <div className="h-full rounded-xl border bg-card shadow-sm flex items-center justify-center p-4">
          <p className="text-red-500 text-sm text-center">{error}</p>
        </div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="h-full p-3">
        <div className="h-full rounded-xl border bg-card shadow-sm flex items-center justify-center p-4">
          <p className="text-muted-foreground text-sm text-center">No hay conversaciones</p>
        </div>
      </div>
    )
  }

  return (
    // 🔥 ESTE WRAPPER ES LA CLAVE: crea el “recuadro” del sidebar y separa del chat
    <div className="h-full p-3 pr-4">
      <div className="h-full rounded-xl border bg-card shadow-sm overflow-hidden">
        <ScrollArea className="h-full">
          {/* padding interno del panel */}
          <div className="space-y-3 p-3">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  "relative w-full rounded-lg border bg-background p-3 text-left shadow-sm transition-[box-shadow,background-color,border-color] duration-150 cursor-pointer hover:z-10",
                  selectedId === conv.id
                    ? "z-10 border-primary/60 bg-primary/10 ring-2 ring-inset ring-primary/25 shadow-md"
                    : "border-border/70 hover:border-border hover:shadow-md",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-sm">
                        {getContactAvatarText(getDisplayName(conv.contact_name, conv.channel), conv.channel)}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={cn(
                        "absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs shadow-md ring-2 ring-background",
                        getChannelColor(conv.channel),
                      )}
                    >
                      {getChannelIcon(conv.channel)}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 mb-1">
                      <h3 className="min-w-0 truncate font-bold text-sm text-foreground">
                        {getDisplayName(conv.contact_name, conv.channel)}
                      </h3>
                      <span className="whitespace-nowrap text-right text-muted-foreground text-xs font-medium">
                        {formatDistanceToNow(new Date(conv.last_message_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>

                    <p className="line-clamp-1 text-muted-foreground text-xs leading-relaxed mb-2">
                      {conv.last_message || "Sin mensajes"}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {conv.unread_count > 0 && (
                        <Badge variant="default" className="h-5 rounded-full px-2 text-xs font-bold shadow-sm">
                          {conv.unread_count}
                        </Badge>
                      )}

                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 rounded-full px-2 text-xs font-semibold border-2",
                          getPriorityColor(conv.priority),
                        )}
                      >
                        {getPriorityLabel(conv.priority)}
                      </Badge>

                      {conv.agent_name && (
                        <span className="truncate text-foreground text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                          👤 {conv.agent_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
