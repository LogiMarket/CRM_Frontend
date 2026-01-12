"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserPlus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Agent {
  id: number
  name: string
  email: string
  status: string
  avatar_url?: string
}

interface AssignAgentDialogProps {
  conversationId: number
  currentAgentId?: number
  onAssign: () => void
}

export function AssignAgentDialog({ conversationId, currentAgentId, onAssign }: AssignAgentDialogProps) {
  const [open, setOpen] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchAgents()
    }
  }, [open])

  const fetchAgents = async () => {
    try {
      const response = await fetch("/api/users/agents")
      const data = await response.json()
      setAgents(data.agents || [])
    } catch (error) {
      console.error("[v0] Fetch agents error:", error)
    }
  }

  const handleAssign = async (agentId: number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/conversations/${conversationId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      })

      if (response.ok) {
        onAssign()
        setOpen(false)
      }
    } catch (error) {
      console.error("[v0] Assign agent error:", error)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500"
      case "busy":
        return "bg-yellow-500"
      case "offline":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      available: "Disponible",
      busy: "Ocupado",
      offline: "Desconectado",
    }
    return labels[status] || status
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Asignar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar Agente</DialogTitle>
          <DialogDescription>Selecciona un agente para asignar esta conversación</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-96">
          <div className="space-y-2">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleAssign(agent.id)}
                disabled={loading || agent.id === currentAgentId}
                className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(agent.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${getStatusColor(agent.status)}`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{agent.name}</h3>
                      {agent.id === currentAgentId && <Badge variant="secondary">Asignado</Badge>}
                    </div>
                    <p className="text-muted-foreground text-xs">{agent.email}</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {getStatusLabel(agent.status)}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
