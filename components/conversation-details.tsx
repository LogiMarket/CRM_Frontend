"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Info,
  FileText,
  User,
  FolderOpen,
  Zap,
  Calendar,
  Plus,
  Video,
  Link,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react"

interface Meeting {
  id: number
  title: string
  date: string
  time: string
  type: "video" | "phone"
}

interface DetailsPanelProps {
  contactName?: string
  contactPhone?: string
  status?: string
  priority?: string
  agentName?: string
  lastActivity?: string
  onStatusChange?: (status: string) => void
  onPriorityChange?: (priority: string) => void
  conversationId?: string | number
  onUpdate?: () => void
}

export function ConversationDetails({
  contactName,
  contactPhone = "whatsapp:+5215548780484",
  status = "active",
  priority = "low",
  agentName = "Juan Perez",
  lastActivity = "16 ene",
  onStatusChange,
  onPriorityChange,
  conversationId,
  onUpdate,
}: DetailsPanelProps) {
  const [currentStatus, setCurrentStatus] = useState(status)
  const [currentPriority, setCurrentPriority] = useState(priority)
  const [meetings, setMeetings] = useState<Meeting[]>([
    { id: 1, title: "Seguimiento pedido", date: "18 ene", time: "10:00", type: "video" },
  ])
  const [scheduledSession, setScheduledSession] = useState<{
    title: string
    date: string
    time: string
    link: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const calendarBookingLink = "https://calendly.com/logimarket/sesion-cliente"

  const handleCopyLink = () => {
    navigator.clipboard.writeText(calendarBookingLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStatusChange = async (value: string) => {
    setCurrentStatus(value)
    onStatusChange?.(value)

    // Actualizar en el backend si hay conversationId
    if (conversationId) {
      try {
        const response = await fetch(`/api/conversations/${conversationId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: value }),
        })

        if (response.ok) {
          onUpdate?.()
        } else {
          setCurrentStatus(status) // Revertir si falla
        }
      } catch (error) {
        console.error("Error updating status:", error)
        setCurrentStatus(status) // Revertir si falla
      }
    }
  }

  const handlePriorityChange = async (value: string) => {
    setCurrentPriority(value)
    onPriorityChange?.(value)

    // Actualizar en el backend si hay conversationId
    if (conversationId) {
      try {
        const response = await fetch(`/api/conversations/${conversationId}/priority`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority: value }),
        })

        if (response.ok) {
          onUpdate?.()
        } else {
          setCurrentPriority(priority) // Revertir si falla
        }
      } catch (error) {
        console.error("Error updating priority:", error)
        setCurrentPriority(priority) // Revertir si falla
      }
    }
  }

  const cleanPhoneNumber = (phone: string) => {
    return phone.replace("whatsapp:", "").replace("+", "")
  }

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 p-2 border-b border-border">
        <div className="flex items-center justify-center w-4 h-4 rounded-full bg-red-100">
          <Info className="h-2.5 w-2.5 text-red-500" />
        </div>
        <span className="font-semibold text-xs text-foreground">Detalles</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Contact Phone */}
        <div className="flex border-b border-border">
          <div className="w-1 bg-orange-400 shrink-0" />
          <div className="flex-1 p-2">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-foreground truncate">{contactPhone}</span>
            </div>
            <a
              href={`https://wa.me/${cleanPhoneNumber(contactPhone)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline ml-4.5 block truncate"
            >
              {contactPhone}
            </a>
          </div>
        </div>

        {/* Status */}
        <div className="flex border-b border-border">
          <div className="w-1 bg-purple-400 shrink-0" />
          <div className="flex-1 p-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                <span className="text-xs text-foreground">Estado</span>
              </div>
              <span className="text-xs text-muted-foreground capitalize">{currentStatus}</span>
            </div>
            <Select value={currentStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-7 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    Activa
                  </div>
                </SelectItem>
                <SelectItem value="pending">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                    Pendiente
                  </div>
                </SelectItem>
                <SelectItem value="resolved">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Resuelta
                  </div>
                </SelectItem>
                <SelectItem value="closed">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                    Cerrada
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Priority */}
        <div className="flex border-b border-border">
          <div className="w-1 bg-orange-400 shrink-0" />
          <div className="flex-1 p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="h-3 w-3 text-orange-500" />
              <span className="text-xs text-foreground">Prioridad</span>
            </div>
            <Select value={currentPriority} onValueChange={handlePriorityChange}>
              <SelectTrigger className="h-7 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Alta
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                    Media
                  </div>
                </SelectItem>
                <SelectItem value="low">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                    Baja
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Agent */}
        <div className="flex border-b border-border">
          <div className="w-1 bg-blue-400 shrink-0" />
          <div className="flex-1 p-2">
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-foreground">Agente</span>
            </div>
            <span className="text-xs font-medium text-primary ml-4.5">{agentName}</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex border-b border-border">
          <div className="w-1 bg-blue-400 shrink-0" />
          <div className="flex-1 p-2">
            <div className="flex items-center gap-1.5">
              <FolderOpen className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-foreground">Timeline</span>
            </div>
            <div className="flex items-center justify-between ml-4.5">
              <span className="text-xs text-muted-foreground">Último:</span>
              <span className="text-xs text-foreground">{lastActivity}</span>
            </div>
          </div>
        </div>

        {/* Meetings */}
        <div className="flex">
          <div className="w-1 bg-green-400 shrink-0" />
          <div className="flex-1 p-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-green-500" />
                <span className="text-xs text-foreground">Reuniones</span>
              </div>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-muted">
                <Plus className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>

            {/* Meetings List */}
            {meetings.length > 0 ? (
              <div className="space-y-1.5">
                {meetings.map((meeting) => (
                  <div key={meeting.id} className="bg-green-50 border border-green-200 rounded p-1.5">
                    <div className="flex items-center gap-1.5">
                      <Video className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-medium text-green-800 truncate">{meeting.title}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5 ml-4.5">
                      <span className="text-xs text-green-600">{meeting.date}</span>
                      <span className="text-xs text-green-600">{meeting.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-2">Sin reuniones agendadas</div>
            )}
          </div>
        </div>

        {/* Booking Section */}
        <div className="flex">
          <div className="w-1 bg-cyan-400 shrink-0" />
          <div className="flex-1 p-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Link className="h-3 w-3 text-cyan-500" />
              <span className="text-xs text-foreground">Agenda</span>
            </div>

            {/* Booking Link */}
            <div className="bg-cyan-50 border border-cyan-200 rounded p-2 mb-2">
              <p className="text-xs text-cyan-800 mb-1.5">Link para agendar sesión:</p>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={calendarBookingLink}
                  readOnly
                  className="flex-1 text-xs bg-white border border-cyan-200 rounded px-2 py-1 text-cyan-700 truncate"
                />
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-cyan-100" onClick={handleCopyLink}>
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-cyan-600" />}
                </Button>
                <a
                  href={calendarBookingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-6 w-6 p-0 flex items-center justify-center hover:bg-cyan-100 rounded"
                >
                  <ExternalLink className="h-3 w-3 text-cyan-600" />
                </a>
              </div>
            </div>

            {/* Scheduled Session */}
            {scheduledSession ? (
              <div className="bg-green-50 border border-green-200 rounded p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Video className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-medium text-green-800">Sesión agendada</span>
                </div>
                <p className="text-xs text-green-700 font-medium">{scheduledSession.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-green-600">{scheduledSession.date}</span>
                  <span className="text-xs text-green-600">{scheduledSession.time}</span>
                </div>
                <a
                  href={scheduledSession.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  <Video className="h-2.5 w-2.5" />
                  Unirse a la sesión
                </a>
              </div>
            ) : (
              <div className="text-center py-2 border border-dashed border-muted rounded">
                <p className="text-xs text-muted-foreground mb-1">Sin sesión agendada</p>
                <p className="text-xs text-muted-foreground">Comparte el link con el cliente</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
