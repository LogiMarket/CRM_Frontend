"use client"

import { useMemo, useState } from "react"
import { InboxHeader } from "@/components/inbox-header"
import { ContactsList } from "@/components/contacts-list"
import { ChatArea } from "@/components/chat-area"
import { OrdersPanel } from "@/components/orders-panel"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import type { Contact } from "@/hooks/use-contacts"

export default function ContactosPage() {
  const [selectedContactId, setSelectedContactId] = useState<string>()
  const [selectedConversationId, setSelectedConversationId] = useState<string>()
  const [selectedContactName, setSelectedContactName] = useState<string>()
  const [selectedChannel, setSelectedChannel] = useState<string>("whatsapp")
  const [selectedExternalUserId, setSelectedExternalUserId] = useState<string>()
  const [refreshKey, setRefreshKey] = useState(0)

  const [newOpen, setNewOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newChannel, setNewChannel] = useState<"whatsapp" | "facebook">("whatsapp")
  const [newPhone, setNewPhone] = useState("")
  const [newExternalUserId, setNewExternalUserId] = useState("")

  const ordersPanelContactId = useMemo(() => {
    const n = Number(selectedContactId)
    return Number.isFinite(n) ? n : undefined
  }, [selectedContactId])

  const handleSelectContact = async (contact: Contact) => {
    setSelectedContactId(String(contact.id))
    setSelectedContactName(String(contact.name || ""))
    setSelectedChannel(String(contact.channel || "whatsapp"))
    setSelectedExternalUserId(contact.external_user_id ? String(contact.external_user_id) : undefined)

    try {
      const res = await fetch("/api/conversations/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contact.id }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast({ title: "Error", description: data?.error || "No se pudo abrir la conversación", variant: "destructive" })
        return
      }

      setSelectedConversationId(String(data?.conversation?.id))
      if (data?.contact?.name) setSelectedContactName(String(data.contact.name))
      if (data?.conversation?.channel) setSelectedChannel(String(data.conversation.channel))
      if (data?.conversation?.external_user_id) setSelectedExternalUserId(String(data.conversation.external_user_id))
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo abrir la conversación", variant: "destructive" })
    }
  }

  const handleUpdate = () => setRefreshKey((p) => p + 1)

  const handleCreateContact = async () => {
    try {
      setCreating(true)
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          channel: newChannel,
          phone_number: newChannel === "whatsapp" ? newPhone : undefined,
          external_user_id: newChannel === "facebook" ? newExternalUserId : undefined,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast({ title: "Error", description: data?.error || "No se pudo crear el contacto", variant: "destructive" })
        return
      }

      toast({ title: "Contacto creado", description: "Ya puedes enviarle mensaje." })
      setNewOpen(false)
      setNewName("")
      setNewPhone("")
      setNewExternalUserId("")

      // Trigger lists to refresh (ContactsList hook refetches on mount; we force remount)
      setRefreshKey((p) => p + 1)
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo crear el contacto", variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <InboxHeader />
      <div className="flex flex-1 overflow-hidden gap-0">
        <div className="flex h-full w-96 flex-col border-r border-border bg-card flex-shrink-0">
          <ContactsList
            key={refreshKey}
            selectedId={selectedContactId}
            onSelect={handleSelectContact}
            headerRight={
              <Dialog open={newOpen} onOpenChange={setNewOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Nuevo</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuevo contacto</DialogTitle>
                    <DialogDescription>
                      Crea un contacto para iniciar una conversación y enviarle mensajes.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Canal</Label>
                      <select
                        value={newChannel}
                        onChange={(e) => setNewChannel(e.target.value === "facebook" ? "facebook" : "whatsapp")}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="whatsapp">WhatsApp</option>
                        <option value="facebook">Facebook</option>
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Nombre</Label>
                      <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej. Ana Martínez" />
                    </div>

                    {newChannel === "whatsapp" ? (
                      <div className="grid gap-2">
                        <Label>Teléfono</Label>
                        <Input
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          placeholder="Ej. +52 1 5611 205 872"
                        />
                        <p className="text-xs text-muted-foreground">Puedes pegarlo con o sin espacios; se normaliza automáticamente.</p>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <Label>PSID (external_user_id)</Label>
                        <Input
                          value={newExternalUserId}
                          onChange={(e) => setNewExternalUserId(e.target.value)}
                          placeholder="Ej. 1234567890"
                        />
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewOpen(false)} disabled={creating}>
                      Cancelar
                    </Button>
                    <Button onClick={() => void handleCreateContact()} disabled={creating}>
                      {creating ? "Creando..." : "Crear"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            }
          />
        </div>

        <div className="w-4 flex-shrink-0 bg-muted/40" aria-hidden="true" />

        <div className="flex flex-1 flex-col min-w-0">
          <ChatArea
            conversationId={selectedConversationId}
            contactName={selectedContactName}
            channel={selectedChannel}
            externalUserId={selectedExternalUserId}
            onUpdate={handleUpdate}
          />
        </div>

        <div className="w-4 flex-shrink-0 bg-muted/40" aria-hidden="true" />

        <div className="hidden xl:flex h-full w-72 flex-col border-l border-border bg-card flex-shrink-0">
          <OrdersPanel contactId={ordersPanelContactId} />
        </div>
      </div>
    </>
  )
}
