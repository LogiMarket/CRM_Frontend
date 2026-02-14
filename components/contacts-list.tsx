"use client"

import { useMemo, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Pencil, Trash2 } from "lucide-react"
import { cn, formatContactDisplayName, getContactAvatarText } from "@/lib/utils"
import { useContacts, type Contact } from "@/hooks/use-contacts"
import { toast } from "@/hooks/use-toast"

function stripWhatsappPrefix(value: string) {
  return String(value || "").replace(/^whatsapp:/i, "")
}

interface ContactsListProps {
  selectedId?: string
  onSelect?: (contact: Contact) => void
  onChat: (contact: Contact) => void
  headerRight?: React.ReactNode
  onDeleted?: (deletedId: string | number) => void
}

export function ContactsList({ selectedId, onSelect, onChat, headerRight, onDeleted }: ContactsListProps) {
  const { contacts, loading, error, refetch } = useContacts()
  const [query, setQuery] = useState("")

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editId, setEditId] = useState<string | number | null>(null)
  const [editChannel, setEditChannel] = useState<string>("whatsapp")
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editExternal, setEditExternal] = useState("")

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | number | null>(null)
  const [deleteLabel, setDeleteLabel] = useState<string>("")

  const openEdit = (c: Contact) => {
    setEditId(c.id)
    setEditChannel(String(c.channel || "whatsapp"))
    setEditName(String(c.name || ""))
    setEditPhone(stripWhatsappPrefix(String(c.phone_number || "")))
    setEditExternal(String(c.external_user_id || ""))
    setEditOpen(true)
  }

  const openDelete = (c: Contact) => {
    setDeleteId(c.id)
    setDeleteLabel(String(c.name || c.phone_number || c.external_user_id || c.id))
    setDeleteOpen(true)
  }

  const handleSaveEdit = async () => {
    if (editId === null) return
    try {
      setEditing(true)
      const res = await fetch(`/api/contacts/${encodeURIComponent(String(editId))}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          phone_number: editPhone,
          external_user_id: editExternal,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast({ title: "Error", description: data?.error || "No se pudo actualizar el contacto", variant: "destructive" })
        return
      }

      toast({ title: "Contacto actualizado", description: "Se guardaron los cambios." })
      setEditOpen(false)
      await refetch()
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo actualizar el contacto", variant: "destructive" })
    } finally {
      setEditing(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (deleteId === null) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/contacts/${encodeURIComponent(String(deleteId))}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast({ title: "Error", description: data?.error || "No se pudo eliminar el contacto", variant: "destructive" })
        return
      }

      toast({ title: "Contacto eliminado" })
      setDeleteOpen(false)
      onDeleted?.(String(deleteId))
      await refetch()
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo eliminar el contacto", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contacts

    return contacts.filter((c) => {
      const channel = String(c.channel || "whatsapp")
      const name = formatContactDisplayName(c.name || "", channel).toLowerCase()
      const phone = formatContactDisplayName(c.phone_number || "", channel).toLowerCase()
      const ext = String(c.external_user_id || "").toLowerCase()
      return name.includes(q) || phone.includes(q) || ext.includes(q)
    })
  }, [contacts, query])

  if (loading) {
    return (
      <div className="h-full p-3">
        <div className="h-full rounded-xl border bg-card shadow-sm flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Cargando contactos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full p-3">
        <div className="h-full rounded-xl border bg-card shadow-sm flex flex-col items-center justify-center p-4 gap-3">
          <p className="text-red-500 text-sm text-center">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-3 pr-4">
      <div className="h-full rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <div>
            <p className="text-sm font-semibold">Contactos</p>
            <p className="text-xs text-muted-foreground">Selecciona para chatear</p>
          </div>
          <div className="flex items-center gap-2">
            {headerRight}
          </div>
        </div>

        <div className="border-b border-border px-3 py-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, teléfono o ID..."
          />
          {!!query.trim() && (
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando {filteredContacts.length} de {contacts.length}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setQuery("")}
              >
                Limpiar
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-2 p-3 pr-4">
            {filteredContacts.length === 0 ? (
              <div className="rounded-lg border bg-background p-4 text-center text-sm text-muted-foreground">
                {contacts.length === 0 ? "No hay contactos" : "Sin resultados"}
              </div>
            ) : (
              filteredContacts.map((c) => {
                const channel = String(c.channel || "whatsapp")
                const displayName = formatContactDisplayName(c.name || c.phone_number, channel)
                const secondary = formatContactDisplayName(c.phone_number, channel)

                return (
                  <div
                    key={String(c.id)}
                    onClick={() => onSelect?.(c)}
                    className={cn(
                      "w-full rounded-lg border bg-background p-3 text-left transition-[background-color,border-color] duration-150 hover:bg-muted/30",
                      selectedId === String(c.id)
                        ? "border-primary/60 bg-primary/10 ring-2 ring-inset ring-primary/25"
                        : "border-border/70 hover:border-border",
                    )}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onSelect?.(c)
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-sm">
                          {getContactAvatarText(displayName, channel)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate font-bold text-sm">{displayName || "Contacto"}</p>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            channel === 'facebook' && "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
                            channel === 'whatsapp' && "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
                          )}>
                            {channel === 'facebook' ? 'Facebook' : 'WhatsApp'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{secondary}</p>
                      </div>

                      <div className="flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="whitespace-nowrap"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              onChat(c)
                            }}
                          >
                            Chatear
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              openEdit(c)
                            }}
                            title="Editar"
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              openDelete(c)
                            }}
                            title="Eliminar"
                            aria-label="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar contacto</DialogTitle>
            <DialogDescription>
              Edita la información del contacto. El canal se mantiene como <span className="font-medium">{editChannel}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nombre</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Ej. Ana Martínez" />
            </div>

            {String(editChannel).toLowerCase() === "facebook" ? (
              <div className="grid gap-2">
                <Label>PSID (external_user_id)</Label>
                <Input value={editExternal} onChange={(e) => setEditExternal(e.target.value)} placeholder="Ej. 1234567890" />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Teléfono</Label>
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Ej. +52 1 5611 205 872" />
                <p className="text-xs text-muted-foreground">Se normaliza a formato WhatsApp automáticamente.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editing}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSaveEdit()} disabled={editing}>
              {editing ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar contacto</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el contacto <span className="font-medium">{deleteLabel}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmDelete()} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
