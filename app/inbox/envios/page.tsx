"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { InboxHeader } from "@/components/inbox-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useContacts } from "@/hooks/use-contacts"
import { formatContactDisplayName } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Send,
  Plus,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  FileText,
  ImageIcon,
  Calendar,
  BarChart3,
  MessageSquare,
  Eye,
  Trash2,
  Copy,
  Pencil,
  Save,
  X,
} from "lucide-react"

// Demo data (UI-only). Cuando quieras lo conectamos a DB/WhatsApp.
type CampaignStatus = "all" | "completed" | "sending" | "scheduled" | "failed"

type Campaign = {
  id: string
  name: string
  status: Exclude<CampaignStatus, "all">
  recipients: number
  delivered: number
  read: number
  replied: number
  failed?: number
  skipped?: number
  date: string
  message: string
}
type RealStats = {
  activeCampaigns: number
  messagesSent: number
  messagesFailed: number
  messagesSkipped: number
  readRate: number
  responseRate: number
}

function toNumber(value: any, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normalizeCampaign(input: any): Campaign | null {
  if (!input || typeof input !== "object") return null
  const statusRaw = String(input.status || "completed")
  const allowedStatus: Array<Exclude<CampaignStatus, "all">> = ["completed", "sending", "scheduled", "failed"]
  const status = (allowedStatus.includes(statusRaw as any) ? statusRaw : "completed") as Exclude<CampaignStatus, "all">

  return {
    id: String(input.id || ""),
    name: String(input.name || "Campaña"),
    status,
    recipients: toNumber(input.recipients),
    delivered: toNumber(input.delivered),
    read: toNumber(input.read),
    replied: toNumber(input.replied),
    failed: input.failed == null ? undefined : toNumber(input.failed),
    skipped: input.skipped == null ? undefined : toNumber(input.skipped),
    date: String(input.date || ""),
    message: String(input.message || ""),
  }
}

type Template = { id: string; name: string; message: string }

type ScheduledBulkJob = {
  id: string
  name: string
  scheduledAt: string // ISO
  contactIds: string[]
  message: string
  whatsappTemplate: null | { name: string; language: string; bodyParams: string[] }
  sendMode?: "template"
}

const SCHEDULED_JOBS_STORAGE_KEY = "bulkScheduledJobs"

function buildScheduledAt(date: string, time: string) {
  const d = String(date || "").trim()
  const t = String(time || "").trim()
  if (!d || !t) return null
  const dt = new Date(`${d}T${t}:00`)
  if (Number.isNaN(dt.getTime())) return null
  return dt
}

function loadScheduledJobs(): ScheduledBulkJob[] {
  try {
    const raw = window.localStorage.getItem(SCHEDULED_JOBS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const parseBooleanish = (value: any, fallback: boolean) => {
      if (typeof value === "boolean") return value
      if (typeof value === "number") return value === 1 ? true : value === 0 ? false : fallback
      if (typeof value === "string") {
        const v = value.trim().toLowerCase()
        if (v === "true" || v === "1" || v === "yes" || v === "y" || v === "on") return true
        if (v === "false" || v === "0" || v === "no" || v === "n" || v === "off") return false
      }
      return fallback
    }

    return parsed
      .map((j) => ({
        id: String(j?.id || ""),
        name: String(j?.name || ""),
        scheduledAt: String(j?.scheduledAt || ""),
        contactIds: Array.isArray(j?.contactIds) ? j.contactIds.map((x: any) => String(x)) : [],
        message: String(j?.message || ""),
        whatsappTemplate: j?.whatsappTemplate && typeof j.whatsappTemplate === "object"
          ? {
              name: String(j.whatsappTemplate?.name || ""),
              language: String(j.whatsappTemplate?.language || ""),
              bodyParams: Array.isArray(j.whatsappTemplate?.bodyParams)
                ? j.whatsappTemplate.bodyParams.map((x: any) => String(x))
                : [],
            }
          : null,
        sendMode: "template" as const,
      }))
      .filter((j) => j.id && j.scheduledAt && j.contactIds.length > 0)
  } catch {
    return []
  }
}

function saveScheduledJobs(jobs: ScheduledBulkJob[]) {
  try {
    window.localStorage.setItem(SCHEDULED_JOBS_STORAGE_KEY, JSON.stringify(jobs))
  } catch {
    // ignore
  }
}

const demoTemplates: Template[] = [
  { id: "1", name: "Bienvenida", message: "Hola {{nombre}}! Bienvenido a LogiMarket. Estamos para servirte." },
  { id: "2", name: "Seguimiento", message: "Hola {{nombre}}, queremos saber cómo fue tu experiencia con tu pedido #{{pedido}}." },
  { id: "3", name: "Promoción", message: "{{nombre}}, tenemos ofertas especiales para ti. Visita nuestra tienda." },
  { id: "4", name: "Recordatorio", message: "Hola {{nombre}}, te recordamos que tienes un pedido pendiente por confirmar." },
]

 

export default function EnviosMasivosPage() {
  const { contacts, loading: contactsLoading, error: contactsError, refetch: refetchContacts } = useContacts()
  const [campaigns, setCampaigns] = useState<Array<Campaign>>([])
  const [filter, setFilter] = useState<CampaignStatus>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [sendingBulk, setSendingBulk] = useState(false)
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledBulkJob[]>([])
  const scheduledTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    message: "",
    whatsappTemplateName: "",
    whatsappTemplateLanguage: "",
    whatsappTemplateBodyParams: "",
    sendMode: "template" as "template",
    scheduleDate: "",
    scheduleTime: "",
  })
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null)
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false)
  const [templates, setTemplates] = useState<Template[]>(() => demoTemplates.map((t) => ({ ...t })))
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [newTemplate, setNewTemplate] = useState({ name: "", message: "" })
  const [realStats, setRealStats] = useState<RealStats | null>(null)

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [campaigns, filter, searchQuery])

  const activeFromList = useMemo(() => {
    return campaigns.filter((c) => c.status === "scheduled" || c.status === "sending").length
  }, [campaigns])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Completado</Badge>
      case "sending":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Enviando</Badge>
      case "scheduled":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Programado</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Fallido</Badge>
      default:
        return null
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "sending":
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />
      case "scheduled":
        return <Calendar className="h-4 w-4 text-yellow-600" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  const selectAllContacts = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(contacts.map((c) => String(c.id)))
    }
  }

  const applyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setNewCampaign((prev) => ({ ...prev, message: template.message }))
    }
  }

  const handleSaveTemplate = () => {
    if (!newTemplate.name || !newTemplate.message) return
    const newId = String(Date.now())
    setTemplates((prev) => [...prev, { id: newId, name: newTemplate.name, message: newTemplate.message }])
    setNewTemplate({ name: "", message: "" })
  }

  const handleUpdateTemplate = () => {
    if (!editingTemplate) return
    setTemplates((prev) => prev.map((t) => (t.id === editingTemplate.id ? editingTemplate : t)))
    setEditingTemplate(null)
  }

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  const handleCopyTemplate = (template: Template) => {
    setTemplates((prev) => [
      ...prev,
      { id: String(Date.now()), name: `${template.name} (copia)`, message: template.message },
    ])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/campaigns/stats")
        const data = await res.json().catch(() => null)
        if (!res.ok) return
        if (cancelled) return
        setRealStats({
          activeCampaigns: Number(data?.activeCampaigns || 0),
          messagesSent: Number(data?.messagesSent || 0),
          messagesFailed: Number(data?.messagesFailed || 0),
          messagesSkipped: Number(data?.messagesSkipped || 0),
          readRate: Number(data?.readRate || 0),
          responseRate: Number(data?.responseRate || 0),
        })
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/campaigns")
        const data = await res.json().catch(() => null)
        if (!res.ok) return
        if (cancelled) return
        const fromDb = Array.isArray(data?.campaigns) ? data.campaigns : []
        const normalized = fromDb.map(normalizeCampaign).filter(Boolean) as Campaign[]
        setCampaigns(normalized)
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setScheduledJobs(loadScheduledJobs())
  }, [])

  useEffect(() => {
    saveScheduledJobs(scheduledJobs)

    // Reset timers
    Object.values(scheduledTimersRef.current).forEach((t) => clearTimeout(t))
    scheduledTimersRef.current = {}

    // Schedule execution (requires the UI to be open)
    for (const job of scheduledJobs) {
      const when = new Date(job.scheduledAt)
      const ms = when.getTime() - Date.now()
      if (Number.isNaN(when.getTime())) continue
      if (ms <= 0) continue

      scheduledTimersRef.current[job.id] = setTimeout(() => {
        void runScheduledJob(job.id)
      }, ms)
    }
  }, [scheduledJobs])

  const runScheduledJob = async (jobId: string) => {
    const job = scheduledJobs.find((j) => j.id === jobId)
    if (!job) return

    const parseBooleanish = (value: any, fallback: boolean) => {
      if (typeof value === "boolean") return value
      if (typeof value === "number") return value === 1 ? true : value === 0 ? false : fallback
      if (typeof value === "string") {
        const v = value.trim().toLowerCase()
        if (v === "true" || v === "1" || v === "yes" || v === "y" || v === "on") return true
        if (v === "false" || v === "0" || v === "no" || v === "n" || v === "off") return false
      }
      return fallback
    }

    setCampaigns((prev) => prev.map((c) => (c.id === jobId ? { ...c, status: "sending" } : c)))

    try {
      const res = await fetch("/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: job.contactIds,
          message: job.message,
          whatsappTemplate: job.whatsappTemplate,
          sendMode: job.sendMode || "auto",
          skipIfOutside24h: parseBooleanish(job.skipIfOutside24h, true),
          campaignId: job.id,
          campaignName: job.name,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setCampaigns((prev) => prev.map((c) => (c.id === jobId ? { ...c, status: "failed" } : c)))
        toast({ title: "Error", description: data?.error || "No se pudo ejecutar la campaña programada", variant: "destructive" })
        return
      }

      const sent = Number(data?.sent || 0)
      const failed = Number(data?.failed || 0)
      const skipped = Number(data?.skipped || 0)
      const total = Number(data?.total || job.contactIds.length)

      const firstError = Array.isArray(data?.results)
        ? String((data.results.find((r: any) => r && r.ok === false && !r.skipped)?.error || "") ?? "").trim()
        : ""

      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === jobId
            ? {
                ...c,
                status: failed === 0 ? "completed" : sent > 0 ? "completed" : "failed",
                recipients: total,
                delivered: sent,
                failed,
                skipped,
              }
            : c,
        ),
      )

      if (failed > 0) {
        toast({
          title: "Campaña ejecutada (parcial)",
          description: `${`Enviados: ${sent}. Omitidos: ${skipped}. Fallidos: ${failed}. Total: ${total}.`}${firstError ? ` Primer error: ${firstError}` : ""}`,
          variant: "destructive",
        })
      } else if (skipped > 0) {
        toast({
          title: "Campaña ejecutada (con omitidos)",
          description: `Enviados: ${sent}. Omitidos: ${skipped}. Total: ${total}.`,
        })
      } else {
        toast({ title: "Campaña ejecutada", description: `Enviados ${sent} mensajes.` })
      }
    } catch (e) {
      setCampaigns((prev) => prev.map((c) => (c.id === jobId ? { ...c, status: "failed" } : c)))
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo ejecutar la campaña programada", variant: "destructive" })
    } finally {
      setScheduledJobs((prev) => prev.filter((j) => j.id !== jobId))
    }
  }

  const cancelScheduledJob = (jobId: string) => {
    setScheduledJobs((prev) => prev.filter((j) => j.id !== jobId))
    setCampaigns((prev) => prev.map((c) => (c.id === jobId ? { ...c, status: "failed" } : c)))
    toast({ title: "Envío cancelado", description: "La campaña programada fue cancelada." })
  }

  const handleCreateCampaign = async (mode: "send" | "schedule") => {
    const name = newCampaign.name.trim()
    const messageTemplate = newCampaign.message.trim()

    if (!name) {
      toast({ title: "Falta el nombre", description: "Escribe un nombre para la campaña.", variant: "destructive" })
      return
    }
    if (!messageTemplate) {
      toast({
        title: "Falta el mensaje",
        description: "Escribe el texto que se mostrará en el historial (no se envía como texto libre; el envío real será por plantilla).",
        variant: "destructive",
      })
      return
    }
    if (selectedContacts.length === 0) {
      toast({ title: "Sin destinatarios", description: "Selecciona al menos un contacto.", variant: "destructive" })
      return
    }

    const whatsappTemplateName = newCampaign.whatsappTemplateName.trim()
    const whatsappTemplateLanguage = newCampaign.whatsappTemplateLanguage.trim()
    const bodyParams = newCampaign.whatsappTemplateBodyParams
      .split(/\r?\n|,/g)
      .map((x) => x.trim())
      .filter(Boolean)

    const sendMode = "template" as const
    const whatsappTemplate = whatsappTemplateName && whatsappTemplateLanguage
      ? { name: whatsappTemplateName, language: whatsappTemplateLanguage, bodyParams }
      : null

    if (!whatsappTemplate) {
      toast({ title: "Falta la plantilla", description: "Para envíos masivos solo se permite WhatsApp Template oficial (name y language).", variant: "destructive" })
      return
    }

    if (mode === "schedule") {
      if (!newCampaign.scheduleDate) {
        toast({ title: "Falta la fecha", description: "Selecciona una fecha para programar.", variant: "destructive" })
        return
      }
      if (!newCampaign.scheduleTime) {
        toast({ title: "Falta la hora", description: "Selecciona una hora para programar.", variant: "destructive" })
        return
      }

      const scheduledAt = buildScheduledAt(newCampaign.scheduleDate, newCampaign.scheduleTime)
      if (!scheduledAt) {
        toast({ title: "Fecha inválida", description: "Revisa la fecha y hora seleccionadas.", variant: "destructive" })
        return
      }

      let campaignId = String(Date.now())
      try {
        const res = await fetch("/api/campaigns/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            message: messageTemplate,
            sendMode,
            contactIds: selectedContacts,
            scheduledAt: scheduledAt.toISOString(),
            whatsappTemplate,
          }),
        })
        const data = await res.json().catch(() => null)
        if (res.ok && data?.campaignId) {
          campaignId = String(data.campaignId)
        }
      } catch {
        // ignore (UI-only scheduler still works)
      }

      const created: Campaign = {
        id: campaignId,
        name,
        status: "scheduled",
        recipients: selectedContacts.length,
        delivered: 0,
        read: 0,
        replied: 0,
        date: `${newCampaign.scheduleDate} ${newCampaign.scheduleTime}`,
        message: messageTemplate,
      }

      setCampaigns((prev) => [created, ...prev])
      setScheduledJobs((prev) => [
        ...prev,
        {
          id: created.id,
          name: created.name,
          scheduledAt: scheduledAt.toISOString(),
          contactIds: [...selectedContacts],
          message: messageTemplate,
          whatsappTemplate,
          sendMode,
        },
      ])

      setShowNewDialog(false)
      setSelectedContacts([])
      setNewCampaign({
        name: "",
        message: "",
        whatsappTemplateName: "",
        whatsappTemplateLanguage: "",
        whatsappTemplateBodyParams: "",
        sendMode: "template",
        scheduleDate: "",
        scheduleTime: "",
      })

      toast({
        title: "Campaña programada",
        description: `Se programó para ${created.date}. (Requiere dejar abierto este panel o configurar un cron en servidor)` ,
      })
      return
    }

    try {
      setSendingBulk(true)

      const res = await fetch("/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: selectedContacts,
          message: messageTemplate,
          whatsappTemplate,
          sendMode,
          campaignName: name,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast({ title: "Error", description: data?.error || "No se pudo enviar el envío masivo", variant: "destructive" })
        return
      }

      const sent = Number(data?.sent || 0)
      const failed = Number(data?.failed || 0)
      const skipped = Number(data?.skipped || 0)
      const total = Number(data?.total || selectedContacts.length)

      const firstError = Array.isArray(data?.results)
        ? String((data.results.find((r: any) => r && r.ok === false && !r.skipped)?.error || "") ?? "").trim()
        : ""

      const today = new Date().toISOString().slice(0, 10)
      const created: Campaign = {
        id: String(data?.campaignId || Date.now()),
        name,
        status: failed === 0 ? "completed" : sent > 0 ? "completed" : "failed",
        recipients: total,
        delivered: sent,
        read: 0,
        replied: 0,
        failed,
        skipped,
        date: today,
        message: messageTemplate,
      }

      setCampaigns((prev) => [created, ...prev])
      setShowNewDialog(false)
      setSelectedContacts([])
      setNewCampaign({
        name: "",
        message: "",
        whatsappTemplateName: "",
        whatsappTemplateLanguage: "",
        whatsappTemplateBodyParams: "",
        sendMode: "template",
        scheduleDate: "",
        scheduleTime: "",
      })

      if (failed > 0) {
        toast({
          title: "Envío parcial",
          description: `${`Enviados: ${sent}. Omitidos: ${skipped}. Fallidos: ${failed}. Total: ${total}.`}${firstError ? ` Primer error: ${firstError}` : ""}`,
          variant: "destructive",
        })
      } else if (skipped > 0) {
        toast({
          title: "Envío masivo enviado (con omitidos)",
          description: `Enviados: ${sent}. Omitidos: ${skipped}. Total: ${total}.`,
        })
      } else {
        toast({ title: "Envío masivo enviado", description: `Enviados ${sent} mensajes.` })
      }

      if (data?.persisted === false) {
        toast({
          title: "Aviso",
          description: "No se pudo registrar la campaña en bulk_campaigns. Se guardó el tracking en messages.metadata (fallback).",
        })
      }

      // Refresh real stats (best-effort)
      try {
        const statsRes = await fetch("/api/campaigns/stats")
        const stats = await statsRes.json().catch(() => null)
        if (statsRes.ok) {
          setRealStats({
            activeCampaigns: Number(stats?.activeCampaigns || 0),
            messagesSent: Number(stats?.messagesSent || 0),
            messagesFailed: Number(stats?.messagesFailed || 0),
            messagesSkipped: Number(stats?.messagesSkipped || 0),
            readRate: Number(stats?.readRate || 0),
            responseRate: Number(stats?.responseRate || 0),
          })
        }
      } catch {
        // ignore
      }
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo enviar el envío masivo", variant: "destructive" })
    } finally {
      setSendingBulk(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <InboxHeader />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Campañas Activas</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.max(realStats?.activeCampaigns ?? 0, activeFromList)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-indigo-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Mensajes Enviados</p>
                  <p className="text-2xl font-bold text-foreground">{realStats ? realStats.messagesSent : 0}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Tasa de Lectura</p>
                  <p className="text-2xl font-bold text-foreground">{realStats ? `${realStats.readRate}%` : "0%"}</p>
                </div>
                <Eye className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Tasa de Respuesta</p>
                  <p className="text-2xl font-bold text-foreground">{realStats ? `${realStats.responseRate}%` : "0%"}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Campañas</CardTitle>

                <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                      <Plus className="h-4 w-4" />
                      Nueva
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Nueva Campaña de Envío Masivo</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Nombre de la campaña</label>
                        <Input
                          placeholder="Ej: Promoción Febrero"
                          value={newCampaign.name}
                          onChange={(e) => setNewCampaign((prev) => ({ ...prev, name: e.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">Plantilla (opcional)</label>
                        <Select onValueChange={applyTemplate}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una plantilla" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-2">
                          Nota: este selector solo llena el texto del mensaje. Si quieres usar una plantilla oficial de WhatsApp (aprobada por Meta),
                          completa los campos de abajo (name/language/params) y el envío a WhatsApp se hará como <span className="font-mono">template</span>.
                        </p>
                      </div>

                      <div className="border rounded-lg p-3 space-y-3">
                        <div className="text-sm font-medium">WhatsApp Template oficial (opcional)</div>

                        <p className="text-xs text-muted-foreground">
                          Este módulo está configurado para enviar masivos únicamente con plantillas oficiales de WhatsApp (Meta).
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium mb-1 block">Template name</label>
                            <Input
                              placeholder="Ej: bienvenida_logimarket"
                              value={newCampaign.whatsappTemplateName}
                              onChange={(e) =>
                                setNewCampaign((prev) => ({ ...prev, whatsappTemplateName: e.target.value }))
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">Language code</label>
                            <Input
                              placeholder="Ej: es_MX"
                              value={newCampaign.whatsappTemplateLanguage}
                              onChange={(e) =>
                                setNewCampaign((prev) => ({ ...prev, whatsappTemplateLanguage: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Body params (uno por línea o separados por coma)</label>
                          <Textarea
                            placeholder="Ej:\n{{nombre}}"
                            rows={2}
                            value={newCampaign.whatsappTemplateBodyParams}
                            onChange={(e) =>
                              setNewCampaign((prev) => ({ ...prev, whatsappTemplateBodyParams: e.target.value }))
                            }
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Estos params se mapean a <span className="font-mono">{"{{1}}"}</span>, <span className="font-mono">{"{{2}}"}</span>, etc. Ej: si tu template dice “Hola <span className="font-mono">{"{{1}}"}</span>”, el primer param debe ser el nombre.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">Mensaje</label>
                        <Textarea
                          placeholder="Texto para historial (no se envía como texto libre; el envío real será por plantilla). Ej: Hola {{nombre}}! Bienvenido a LogiMarket."
                          rows={4}
                          value={newCampaign.message}
                          onChange={(e) => setNewCampaign((prev) => ({ ...prev, message: e.target.value }))}
                        />
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" size="sm" className="text-xs bg-transparent" type="button">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            Imagen
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs bg-transparent" type="button">
                            <FileText className="h-3 w-3 mr-1" />
                            Archivo
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Seleccionar destinatarios ({selectedContacts.length} seleccionados)
                        </label>
                        <div className="border rounded-lg max-h-48 overflow-y-auto">
                          <div className="p-2 border-b bg-muted/50 sticky top-0">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={contacts.length > 0 && selectedContacts.length === contacts.length}
                                onCheckedChange={selectAllContacts}
                              />
                              <span className="text-sm">Seleccionar todos</span>
                            </div>
                          </div>

                          {contactsLoading ? (
                            <div className="p-3 text-sm text-muted-foreground">Cargando contactos...</div>
                          ) : contactsError ? (
                            <div className="p-3">
                              <p className="text-sm text-red-500">{contactsError}</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 bg-transparent"
                                onClick={() => void refetchContacts()}
                                type="button"
                              >
                                Reintentar
                              </Button>
                            </div>
                          ) : contacts.length === 0 ? (
                            <div className="p-3 text-sm text-muted-foreground">No hay contactos para seleccionar.</div>
                          ) : (
                            contacts.map((contact) => {
                              const channel = String(contact.channel || "whatsapp")
                              const primary = formatContactDisplayName(contact.name || contact.phone_number || contact.external_user_id || "", channel)
                              const secondaryRaw = channel === "facebook" ? (contact.external_user_id || "") : (contact.phone_number || "")
                              const secondary = formatContactDisplayName(secondaryRaw, channel)
                              const id = String(contact.id)
                              const checked = selectedContacts.includes(id)

                              return (
                                <div
                                  key={id}
                                  className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer"
                                  onClick={() => toggleContact(id)}
                                >
                                  <Checkbox checked={checked} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{primary || "Contacto"}</p>
                                    <p className="text-xs text-muted-foreground truncate">{secondary}</p>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {channel === "facebook" ? "Facebook" : "WhatsApp"}
                                  </Badge>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Programar fecha</label>
                          <Input
                            type="date"
                            value={newCampaign.scheduleDate}
                            onChange={(e) => setNewCampaign((prev) => ({ ...prev, scheduleDate: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Hora</label>
                          <Input
                            type="time"
                            value={newCampaign.scheduleTime}
                            onChange={(e) => setNewCampaign((prev) => ({ ...prev, scheduleTime: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                          Cancelar
                        </Button>
                        <Button
                          className="gap-1"
                          type="button"
                          variant="outline"
                          onClick={() => void handleCreateCampaign("schedule")}
                          disabled={sendingBulk || !newCampaign.scheduleDate || !newCampaign.scheduleTime}
                          title={!newCampaign.scheduleDate || !newCampaign.scheduleTime ? "Selecciona fecha y hora" : undefined}
                        >
                          <Calendar className="h-4 w-4" />
                          Programar
                        </Button>
                        <Button
                          className="gap-1"
                          type="button"
                          onClick={() => void handleCreateCampaign("send")}
                          disabled={sendingBulk}
                        >
                          <Send className="h-4 w-4" />
                          {sendingBulk ? "Enviando..." : "Enviar ahora"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar campaña..."
                    className="pl-8 h-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex gap-1 flex-wrap">
                  {[
                    { value: "all", label: "Todas" },
                    { value: "sending", label: "Enviando" },
                    { value: "scheduled", label: "Prog." },
                    { value: "completed", label: "Compl." },
                    { value: "failed", label: "Fallidas" },
                  ].map((f) => (
                    <Button
                      key={f.value}
                      variant={filter === (f.value as CampaignStatus) ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => setFilter(f.value as CampaignStatus)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredCampaigns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No se encontraron campañas</div>
                ) : (
                  filteredCampaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setPreviewCampaign(campaign as Campaign)
                        setShowPreviewDialog(true)
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(campaign.status)}
                          <div>
                            <p className="font-medium text-sm">{campaign.name}</p>
                            <p className="text-xs text-muted-foreground">{campaign.date}</p>
                          </div>
                        </div>
                        {getStatusBadge(campaign.status)}
                      </div>

                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {campaign.recipients} dest.
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {campaign.delivered} enviados
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {campaign.read} leídos
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {campaign.replied} resp.
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm bg-transparent"
                  onClick={() => setShowNewDialog(true)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Nuevo envío masivo
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm bg-transparent" type="button">
                  <Users className="h-4 w-4 mr-2" />
                  Importar contactos
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm bg-transparent"
                  onClick={() => setShowTemplatesDialog(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Gestionar plantillas
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Plantillas</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setShowTemplatesDialog(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Nueva
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[250px] overflow-y-auto">
                {templates.map((template) => (
                  <div key={template.id} className="p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{template.name}</p>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setEditingTemplate({ ...template })}
                          type="button"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyTemplate(template)}
                          type="button"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteTemplate(template.id)}
                          type="button"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{template.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestionar Plantillas</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium text-sm mb-3">Crear nueva plantilla</h4>
              <div className="space-y-3">
                <Input
                  placeholder="Nombre de la plantilla"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate((prev) => ({ ...prev, name: e.target.value }))}
                />
                <Textarea
                  placeholder="Mensaje de la plantilla. Usa variables como {{nombre}}, {{pedido}}, {{fecha}}"
                  rows={3}
                  value={newTemplate.message}
                  onChange={(e) => setNewTemplate((prev) => ({ ...prev, message: e.target.value }))}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Variables: {"{{nombre}}"}, {"{{pedido}}"}, {"{{fecha}}"}, {"{{telefono}}"}
                  </p>
                  <Button size="sm" onClick={handleSaveTemplate} disabled={!newTemplate.name || !newTemplate.message}>
                    <Save className="h-4 w-4 mr-1" />
                    Guardar
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-3">Plantillas existentes ({templates.length})</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {templates.map((template) => (
                  <div key={template.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    {editingTemplate?.id === template.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editingTemplate.name}
                          onChange={(e) =>
                            setEditingTemplate((prev) => (prev ? { ...prev, name: e.target.value } : null))
                          }
                        />
                        <Textarea
                          rows={2}
                          value={editingTemplate.message}
                          onChange={(e) =>
                            setEditingTemplate((prev) => (prev ? { ...prev, message: e.target.value } : null))
                          }
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingTemplate(null)} type="button">
                            <X className="h-3 w-3 mr-1" />
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={handleUpdateTemplate} type="button">
                            <Save className="h-3 w-3 mr-1" />
                            Guardar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{template.name}</p>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditingTemplate({ ...template })}
                              type="button"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleCopyTemplate(template)}
                              type="button"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteTemplate(template.id)}
                              type="button"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{template.message}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles de Campaña</DialogTitle>
          </DialogHeader>

          {previewCampaign && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{previewCampaign.name}</h3>
                {getStatusBadge(previewCampaign.status)}
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{previewCampaign.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Fecha de envío</p>
                  <p className="font-medium">{previewCampaign.date}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Destinatarios</p>
                  <p className="font-medium">{previewCampaign.recipients}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Enviados</p>
                  <p className="font-medium text-green-600">{previewCampaign.delivered}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Omitidos</p>
                  <p className="font-medium">{Number(previewCampaign.skipped || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Leídos</p>
                  <p className="font-medium text-blue-600">{previewCampaign.read}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Respuestas</p>
                  <p className="font-medium text-orange-600">{previewCampaign.replied}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fallidos</p>
                  <p className="font-medium text-red-600">{Number(previewCampaign.failed || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tasa de apertura</p>
                  <p className="font-medium">
                    {previewCampaign.delivered > 0
                      ? Math.round((previewCampaign.read / previewCampaign.delivered) * 100)
                      : 0}
                    %
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                {previewCampaign.status === "scheduled" && (
                  <Button
                    variant="outline"
                    className="text-red-600 bg-transparent"
                    type="button"
                    onClick={() => {
                      cancelScheduledJob(previewCampaign.id)
                      setShowPreviewDialog(false)
                    }}
                  >
                    Cancelar envío
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowPreviewDialog(false)} type="button">
                  Cerrar
                </Button>
                {previewCampaign.status === "scheduled" && (
                  <Button
                    type="button"
                    onClick={() => {
                      void runScheduledJob(previewCampaign.id)
                      setShowPreviewDialog(false)
                    }}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Enviar ahora
                  </Button>
                )}
                {previewCampaign.status === "completed" && (
                  <Button type="button">
                    <Copy className="h-4 w-4 mr-1" />
                    Duplicar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
