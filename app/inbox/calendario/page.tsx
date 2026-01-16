"use client"

import { useEffect, useMemo, useState } from "react"
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Phone, Video, Users, ArrowLeft, ArrowRight, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface CallEvent {
  id: string
  scheduled_at: string
  contact_name?: string
  phone_number?: string
  call_type?: string
  status?: string
  type: "call"
}

interface SessionEvent {
  id: string
  session_date: string
  user_name: string
  user_email: string
  session_type?: string
  type: "session"
}

type CalendarEvent = CallEvent | SessionEvent

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [callsRes, sessionsRes] = await Promise.all([
          fetch("/api/calls"),
          fetch("/api/sessions"),
        ])

        const callsData = await callsRes.json()
        const sessionsData = await sessionsRes.json()

        const callEvents: CalendarEvent[] = (callsData.calls || []).map((c: any) => ({
          ...c,
          type: "call" as const,
        }))
        const sessionEvents: CalendarEvent[] = (sessionsData.sessions || []).map((s: any) => ({
          ...s,
          type: "session" as const,
        }))

        setEvents([...callEvents, ...sessionEvents])
      } catch (error) {
        console.error("[Calendar] fetch error", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { locale: es })
    const end = endOfWeek(endOfMonth(currentMonth), { locale: es })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    events.forEach((event) => {
      const dateStr = event.type === "call" ? event.scheduled_at : event.session_date
      const date = dateStr ? parseISO(dateStr) : null
      if (!date || !isSameMonth(date, currentMonth)) return
      const key = format(date, "yyyy-MM-dd")
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(event)
    })
    return map
  }, [events, currentMonth])

  const renderBadge = (event: CalendarEvent) => {
    if (event.type === "call") {
      return (
        <Badge variant="outline" className="gap-1 text-xs">
          {event.call_type === "video" ? <Video className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
          {event.status || "pendiente"}
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <Users className="h-3 w-3" /> {event.session_type || "sesión"}
      </Badge>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background min-h-screen">
      <div className="border-b border-border bg-card p-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <div>
            <h1 className="text-xl font-bold">Calendario</h1>
            <p className="text-muted-foreground text-sm">Llamadas y sesiones agendadas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[160px] text-center font-semibold">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="text-center text-muted-foreground">Cargando eventos...</p>
        ) : (
          <div className="grid grid-cols-7 gap-3">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd")
              const dayEvents = eventsByDay.get(key) || []
              const withinMonth = isSameMonth(day, currentMonth)
              return (
                <Card
                  key={key}
                  className={cn(
                    "min-h-[140px] flex flex-col",
                    !withinMonth && "bg-muted/30 text-muted-foreground"
                  )}
                >
                  <CardHeader className="py-3 px-3">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-sm font-semibold", isToday(day) && "text-primary")}>{format(day, "d", { locale: es })}</span>
                      {isToday(day) && <Badge variant="secondary">Hoy</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-2">
                    {dayEvents.slice(0, 3).map((event) => {
                      const dateStr = event.type === "call" ? event.scheduled_at : event.session_date
                      return (
                        <div
                          key={`${event.type}-${event.id}`}
                          className="rounded-md border border-border bg-card/70 p-2 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold line-clamp-1">
                              {event.type === "call"
                                ? event.contact_name || "Llamada"
                                : event.user_name || "Sesión"}
                            </span>
                            {renderBadge(event)}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {dateStr ? format(parseISO(dateStr), "HH:mm", { locale: es }) : "--:--"}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {event.type === "call"
                              ? event.phone_number || "Sin teléfono"
                              : event.user_email}
                          </p>
                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <p className="text-[11px] text-muted-foreground">+{dayEvents.length - 3} eventos más</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
