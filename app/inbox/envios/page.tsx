"use client"

import { useMemo, useState } from "react"
import { InboxHeader } from "@/components/inbox-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
const demoCampaigns = [
  {
    id: "1",
    name: "Promoción Enero",
    status: "completed",
    recipients: 150,
    delivered: 148,
    read: 120,
    replied: 35,
    date: "2026-01-10",
    message: "Hola! Aprovecha nuestras ofertas de enero con hasta 30% de descuento.",
  },
  {
    id: "2",
    name: "Seguimiento Pedidos",
    status: "sending",
    recipients: 85,
    delivered: 45,
    read: 30,
    replied: 12,
    date: "2026-01-16",
    message: "Tu pedido está en camino. Rastrea tu envío con el siguiente enlace.",
  },
  {
    id: "3",
    name: "Encuesta Satisfacción",
    status: "scheduled",
    recipients: 200,
    delivered: 0,
    read: 0,
    replied: 0,
    date: "2026-01-20",
    message: "Nos gustaría conocer tu opinión sobre nuestro servicio.",
  },
  {
    id: "4",
    name: "Campaña Fallida",
    status: "failed",
    recipients: 50,
    delivered: 10,
    read: 5,
    replied: 0,
    date: "2026-01-08",
    message: "Mensaje de prueba que falló.",
  },
] as const

const demoContacts = [
  { id: "1", name: "Ana Martínez", phone: "+521 555 123 4567", tags: ["cliente", "vip"] },
  { id: "2", name: "Roberto Pérez", phone: "+521 555 234 5678", tags: ["cliente"] },
  { id: "3", name: "Laura Hernández", phone: "+521 555 345 6789", tags: ["prospecto"] },
  { id: "4", name: "Carlos García", phone: "+521 555 456 7890", tags: ["cliente", "mayorista"] },
  { id: "5", name: "María López", phone: "+521 555 567 8901", tags: ["prospecto"] },
  { id: "6", name: "Juan Rodríguez", phone: "+521 555 678 9012", tags: ["cliente"] },
] as const

type Template = { id: string; name: string; message: string }

const demoTemplates: Template[] = [
  { id: "1", name: "Bienvenida", message: "Hola {{nombre}}! Bienvenido a LogiMarket. Estamos para servirte." },
  { id: "2", name: "Seguimiento", message: "Hola {{nombre}}, queremos saber cómo fue tu experiencia con tu pedido #{{pedido}}." },
  { id: "3", name: "Promoción", message: "{{nombre}}, tenemos ofertas especiales para ti. Visita nuestra tienda." },
  { id: "4", name: "Recordatorio", message: "Hola {{nombre}}, te recordamos que tienes un pedido pendiente por confirmar." },
]

type CampaignStatus = "all" | "completed" | "sending" | "scheduled" | "failed"

type Campaign = (typeof demoCampaigns)[number]

export default function EnviosMasivosPage() {
  const [filter, setFilter] = useState<CampaignStatus>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    message: "",
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

  const filteredCampaigns = useMemo(() => {
    return demoCampaigns.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [filter, searchQuery])

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
    if (selectedContacts.length === demoContacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(demoContacts.map((c) => c.id))
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

  const totalSent = demoCampaigns.reduce((acc, c) => acc + c.delivered, 0)
  const totalRead = demoCampaigns.reduce((acc, c) => acc + c.read, 0)
  const totalReplied = demoCampaigns.reduce((acc, c) => acc + c.replied, 0)

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
                    {demoCampaigns.filter((c) => c.status === "sending").length}
                  </p>
                </div>
                <Send className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Mensajes Enviados</p>
                  <p className="text-2xl font-bold text-foreground">{totalSent}</p>
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
                  <p className="text-2xl font-bold text-foreground">
                    {totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0}%
                  </p>
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
                  <p className="text-2xl font-bold text-foreground">
                    {totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0}%
                  </p>
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
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">Mensaje</label>
                        <Textarea
                          placeholder="Escribe tu mensaje aquí. Usa {{nombre}} para personalizar."
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
                                checked={selectedContacts.length === demoContacts.length}
                                onCheckedChange={selectAllContacts}
                              />
                              <span className="text-sm">Seleccionar todos</span>
                            </div>
                          </div>

                          {demoContacts.map((contact) => (
                            <div
                              key={contact.id}
                              className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer"
                              onClick={() => toggleContact(contact.id)}
                            >
                              <Checkbox checked={selectedContacts.includes(contact.id)} />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{contact.name}</p>
                                <p className="text-xs text-muted-foreground">{contact.phone}</p>
                              </div>
                              <div className="flex gap-1">
                                {contact.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Programar fecha (opcional)</label>
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
                        {newCampaign.scheduleDate ? (
                          <Button className="gap-1" type="button">
                            <Calendar className="h-4 w-4" />
                            Programar
                          </Button>
                        ) : (
                          <Button className="gap-1" type="button">
                            <Send className="h-4 w-4" />
                            Enviar ahora
                          </Button>
                        )}
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
                          {campaign.delivered} entregados
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
                  <p className="text-muted-foreground">Entregados</p>
                  <p className="font-medium text-green-600">{previewCampaign.delivered}</p>
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
                  <Button variant="outline" className="text-red-600 bg-transparent" type="button">
                    Cancelar envío
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowPreviewDialog(false)} type="button">
                  Cerrar
                </Button>
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
