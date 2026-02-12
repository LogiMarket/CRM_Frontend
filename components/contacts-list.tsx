"use client"

import { useMemo, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn, formatContactDisplayName, getContactAvatarText } from "@/lib/utils"
import { useContacts, type Contact } from "@/hooks/use-contacts"

interface ContactsListProps {
  selectedId?: string
  onSelect?: (contact: Contact) => void
  onChat: (contact: Contact) => void
  headerRight?: React.ReactNode
}

export function ContactsList({ selectedId, onSelect, onChat, headerRight }: ContactsListProps) {
  const { contacts, loading, error, refetch } = useContacts()
  const [query, setQuery] = useState("")

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
      <div className="h-full rounded-xl border bg-card shadow-sm overflow-hidden">
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

        <ScrollArea className="h-[calc(100%-112px)]">
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
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
