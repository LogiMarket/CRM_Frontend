"use client"

import { useEffect, useMemo, useState } from "react"
import { InboxHeader } from "@/components/inbox-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Calendar,
  Plus,
  Video,
  Phone,
  Clock,
  User,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react"

interface Session {
  id: number
  title: string
  clientName: string
  clientPhone: string
  date: string
  time: string
  type: "video" | "phone"
  status: "scheduled" | "completed" | "cancelled"
  conversationId?: number
  meetLink?: string
}

type CalendarView = "day" | "week" | "month"

const getStartOfWeek = (date: Date) => {
  const d = new Date(date)
  const day = d.getDay() || 7 // Monday as start
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (day - 1))
  return d
}

export default function AgendaPage() {
  const today = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now
  }, [])

  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "scheduled" | "completed" | "cancelled">("all")
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(today))
  const [currentDate, setCurrentDate] = useState<Date>(today)
  const [calendarView, setCalendarView] = useState<CalendarView>("week")
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false)
  const [copied, setCopied] = useState(false)

  const calendarBookingLink = "https://calendly.com/logimarket/sesion-cliente"

  const handleCopyLink = () => {
    navigator.clipboard.writeText(calendarBookingLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const normalizeCallToSession = (call: any): Session => {
    const dateObj = new Date(call.scheduled_at)
    const date = dateObj.toISOString().split("T")[0]
    const time = dateObj.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })

    return {
      id: Number(call.id),
      title: call.notes?.trim() || "Llamada programada",
      clientName: call.contact_name || "Contacto",
      clientPhone: call.phone_number || "",
      date,
      time,
      type: (call.call_type === "video" ? "video" : "phone") as Session["type"],
      status:
        call.status === "completed"
          ? "completed"
          : call.status === "cancelled"
            ? "cancelled"
            : "scheduled",
      conversationId: call.conversation_id,
      meetLink: call.meet_link || undefined,
    }
  }

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/calls")
      const data = await response.json()
      const fetched = (data.calls || []).map(normalizeCallToSession)
      setSessions(fetched)
    } catch (error) {
      console.error("[AgendaPage] Error fetching sessions", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
    const handler = () => fetchSessions()
    window.addEventListener("calls-updated", handler)
    return () => window.removeEventListener("calls-updated", handler)
  }, [])

  const filteredSessions = filter === "all" ? sessions : sessions.filter((s) => s.status === filter)

  const getStatusBadge = (status: Session["status"]) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Programada</Badge>
      case "completed":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Completada</Badge>
      case "cancelled":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Cancelada</Badge>
    }
  }

  const getDaysOfWeek = () => {
    const days = []
    const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart)
      date.setDate(date.getDate() + i)
      days.push({
        name: dayNames[i],
        date: date.getDate(),
        fullDate: date.toISOString().split("T")[0],
        isToday: date.toDateString() === today.toDateString(),
      })
    }
    return days
  }

  const getDaysOfMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []

    let startDayOfWeek = firstDay.getDay() - 1
    if (startDayOfWeek < 0) startDayOfWeek = 6

    for (let i = 0; i < startDayOfWeek; i++) {
      const prevDate = new Date(year, month, -startDayOfWeek + i + 1)
      days.push({
        date: prevDate.getDate(),
        fullDate: prevDate.toISOString().split("T")[0],
        isCurrentMonth: false,
        isToday: false,
      })
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i)
      days.push({
        date: i,
        fullDate: date.toISOString().split("T")[0],
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
      })
    }

    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(year, month + 1, i)
      days.push({
        date: i,
        fullDate: nextDate.toISOString().split("T")[0],
        isCurrentMonth: false,
        isToday: false,
      })
    }

    return days
  }

  const getHoursOfDay = () => {
    const hours = []
    for (let i = 7; i <= 20; i++) {
      hours.push({
        hour: i,
        label: `${i.toString().padStart(2, "0")}:00`,
      })
    }
    return hours
  }

  const getSessionsForHour = (hour: number) => {
    const dateStr = currentDate.toISOString().split("T")[0]
    return sessions.filter((s) => {
      const sessionHour = Number.parseInt(s.time.split(":")[0])
      return s.date === dateStr && sessionHour === hour && s.status === "scheduled"
    })
  }

  const getSessionsForDate = (fullDate: string) => {
    return sessions.filter((s) => s.date === fullDate && s.status === "scheduled")
  }

  const navigate = (direction: "prev" | "next") => {
    if (calendarView === "week") {
      const newDate = new Date(currentWeekStart)
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
      setCurrentWeekStart(newDate)
    } else if (calendarView === "day") {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
      setCurrentDate(newDate)
    } else if (calendarView === "month") {
      const newDate = new Date(currentDate)
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1))
      setCurrentDate(newDate)
    }
  }

  const getCalendarTitle = () => {
    if (calendarView === "day") {
      return currentDate.toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    } else if (calendarView === "week") {
      return currentWeekStart.toLocaleDateString("es-MX", { month: "long", year: "numeric" })
    } else {
      return currentDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" })
    }
  }

  const todayIso = today.toISOString().split("T")[0]
  const todaySessions = sessions.filter((s) => s.date === todayIso && s.status === "scheduled")
  const upcomingSessions = sessions.filter((s) => s.status === "scheduled").length
  const completedSessions = sessions.filter((s) => s.status === "completed").length

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      <InboxHeader />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-muted/30">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            Cargando sesiones...
          </div>
        ) : (
          <>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Sesiones Hoy</p>
                  <p className="text-2xl font-bold text-foreground">{todaySessions.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Próximas</p>
                  <p className="text-2xl font-bold text-foreground">{upcomingSessions}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Completadas</p>
                  <p className="text-2xl font-bold text-foreground">{completedSessions}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Link de reserva</p>
                <div className="flex items-center gap-1">
                  <Input value={calendarBookingLink} readOnly className="h-8 text-xs truncate" />
                  <Button variant="outline" size="sm" className="h-8 px-2 bg-transparent" onClick={handleCopyLink}>
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar View */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Calendario</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex border rounded-md overflow-hidden mr-2">
                    <Button
                      variant={calendarView === "day" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 rounded-none text-xs px-2"
                      onClick={() => setCalendarView("day")}
                    >
                      Día
                    </Button>
                    <Button
                      variant={calendarView === "week" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 rounded-none text-xs px-2 border-x"
                      onClick={() => setCalendarView("week")}
                    >
                      Semana
                    </Button>
                    <Button
                      variant={calendarView === "month" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 rounded-none text-xs px-2"
                      onClick={() => setCalendarView("month")}
                    >
                      Mes
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate("prev")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-40 text-center capitalize">{getCalendarTitle()}</span>
                  <Button variant="outline" size="sm" onClick={() => navigate("next")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {calendarView === "day" && (
                <div className="space-y-1">
                  {getHoursOfDay().map((hourData) => {
                    const hourSessions = getSessionsForHour(hourData.hour)
                    return (
                      <div key={hourData.hour} className="flex border-b border-border/50 min-h-12">
                        <div className="w-16 text-xs text-muted-foreground py-2 pr-2 text-right">{hourData.label}</div>
                        <div className="flex-1 py-1 pl-2">
                          {hourSessions.map((session) => (
                            <div
                              key={session.id}
                              className={`text-xs p-2 rounded mb-1 ${
                                session.type === "video" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {session.type === "video" ? (
                                  <Video className="h-3 w-3" />
                                ) : (
                                  <Phone className="h-3 w-3" />
                                )}
                                <span className="font-medium">
                                  {session.time} - {session.title}
                                </span>
                              </div>
                              <p className="mt-0.5">{session.clientName}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {calendarView === "week" && (
                <div className="grid grid-cols-7 gap-2">
                  {getDaysOfWeek().map((day) => (
                    <div
                      key={day.fullDate}
                      className={`border rounded-lg p-2 min-h-32 ${
                        day.isToday ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <div className="text-center mb-2">
                        <p className="text-xs text-muted-foreground">{day.name}</p>
                        <p className={`text-lg font-semibold ${day.isToday ? "text-primary" : "text-foreground"}`}>
                          {day.date}
                        </p>
                      </div>
                      <div className="space-y-1">
                        {getSessionsForDate(day.fullDate).map((session) => (
                          <div
                            key={session.id}
                            className={`text-xs p-1.5 rounded ${
                              session.type === "video" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            <p className="font-medium truncate">{session.time}</p>
                            <p className="truncate">{session.clientName}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {calendarView === "month" && (
                <div>
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
                      <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {getDaysOfMonth().map((day, index) => {
                      const daySessions = getSessionsForDate(day.fullDate)
                      return (
                        <div
                          key={index}
                          className={`border rounded p-1 min-h-16 ${
                            day.isToday
                              ? "border-primary bg-primary/5"
                              : day.isCurrentMonth
                                ? "border-border"
                                : "border-border/30 bg-muted/30"
                          }`}
                        >
                          <p
                            className={`text-xs text-center ${
                              day.isToday
                                ? "text-primary font-bold"
                                : day.isCurrentMonth
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {day.date}
                          </p>
                          <div className="mt-0.5 space-y-0.5">
                            {daySessions.slice(0, 2).map((session) => (
                              <div
                                key={session.id}
                                className={`text-[10px] px-1 rounded truncate ${
                                  session.type === "video"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-orange-100 text-orange-700"
                                }`}
                              >
                                {session.time}
                              </div>
                            ))}
                            {daySessions.length > 2 && (
                              <div className="text-[10px] text-muted-foreground text-center">
                                +{daySessions.length - 2} más
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sessions List */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-lg">Sesiones</CardTitle>
                <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8">
                      <Plus className="h-3 w-3 mr-1" />
                      Nueva
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agendar nueva sesión</DialogTitle>
                      <DialogDescription>Crea una nueva sesión con un cliente</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title">Título</Label>
                        <Input id="title" placeholder="Ej: Seguimiento pedido" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="client">Cliente</Label>
                        <Input id="client" placeholder="Nombre del cliente" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="date">Fecha</Label>
                          <Input id="date" type="date" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="time">Hora</Label>
                          <Input id="time" type="time" />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="type">Tipo</Label>
                        <Select defaultValue="video">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="video">
                              <div className="flex items-center gap-2">
                                <Video className="h-3 w-3" />
                                Videollamada
                              </div>
                            </SelectItem>
                            <SelectItem value="phone">
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                Llamada telefónica
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="meetLink">Link de reunión (opcional)</Label>
                        <Input id="meetLink" placeholder="https://meet.google.com/..." />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowNewSessionDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={() => setShowNewSessionDialog(false)}>Agendar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex flex-wrap gap-1">
                {(["all", "scheduled", "completed", "cancelled"] as const).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => setFilter(f)}
                  >
                    {f === "all" ? "Todas" : f === "scheduled" ? "Prog." : f === "completed" ? "Compl." : "Cancel."}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className="border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {session.type === "video" ? (
                          <Video className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Phone className="h-4 w-4 text-orange-500" />
                        )}
                        <span className="font-medium text-sm">{session.title}</span>
                      </div>
                      {getStatusBadge(session.status)}
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        <span>{session.clientName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        <span>{session.date}</span>
                        <Clock className="h-3 w-3 ml-2" />
                        <span>{session.time}</span>
                      </div>
                      {session.conversationId && (
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-3 w-3" />
                          <a
                            href={`/inbox/conversaciones?id=${session.conversationId}`}
                            className="text-primary hover:underline"
                          >
                            Ver conversación
                          </a>
                        </div>
                      )}
                      {session.meetLink && session.status === "scheduled" && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <a
                            href={session.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Unirse a la reunión
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        </>
        )}
      </div>
    </div>
  )
}
