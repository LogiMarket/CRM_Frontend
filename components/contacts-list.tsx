"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn, formatContactDisplayName, getContactAvatarText } from "@/lib/utils"
import { useContacts, type Contact } from "@/hooks/use-contacts"

interface ContactsListProps {
  selectedId?: string
  onSelect: (contact: Contact) => void
  headerRight?: React.ReactNode
}

export function ContactsList({ selectedId, onSelect, headerRight }: ContactsListProps) {
  const { contacts, loading, error, refetch } = useContacts()

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
        <ScrollArea className="h-[calc(100%-52px)]">
          <div className="space-y-2 p-3">
            {contacts.length === 0 ? (
              <div className="rounded-lg border bg-background p-4 text-center text-sm text-muted-foreground">
                No hay contactos
              </div>
            ) : (
              contacts.map((c) => {
                const channel = String(c.channel || "whatsapp")
                const displayName = formatContactDisplayName(c.name || c.phone_number, channel)
                const secondary = formatContactDisplayName(c.phone_number, channel)

                return (
                  <button
                    key={String(c.id)}
                    onClick={() => onSelect(c)}
                    className={cn(
                      "w-full rounded-lg border bg-background p-3 text-left shadow-sm transition-[box-shadow,background-color,border-color] duration-150 hover:shadow-md",
                      selectedId === String(c.id)
                        ? "border-primary/60 bg-primary/10 ring-2 ring-inset ring-primary/25"
                        : "border-border/70 hover:border-border",
                    )}
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
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
