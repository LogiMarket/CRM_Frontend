"use client"

import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MessageSquare, TrendingUp, Mail, ChevronDown, ChevronUp, Clock, CheckCircle2 } from "lucide-react"
import { InboxHeader } from "@/components/inbox-header"
import { AddAgentDialog } from "@/components/add-agent-dialog"
import { useUserRole } from "@/hooks/use-user-role"
import { useAgents } from "@/hooks/use-agents"
import { useAgentStats } from "@/hooks/use-agent-stats"
import { useRouter } from "next/navigation"

export default function AgentesPage() {
  const [expandedAgentId, setExpandedAgentId] = useState<number | null>(null)
  const { role, loading } = useUserRole()
  const router = useRouter()

  // Proteger acceso: solo admin y supervisor
  if (!loading && role !== "admin" && role !== "supervisor") {
    return (
      <>
        <InboxHeader />
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="mx-auto max-w-6xl">
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Acceso Denegado</CardTitle>
                <CardDescription>No tienes permisos para acceder a esta sección</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push("/inbox")}>
                  Volver a Conversaciones
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </>
    )
  }
  // Fetch agents from backend
  const { agents, loading: loadingAgents, error } = useAgents()
  const { stats, loading: loadingStats } = useAgentStats()

  // Merge agents with their stats
  const agentStats = agents.map((agent) => {
    const stat = stats.find((s) => s.id === agent.id)
    return {
      ...agent,
      totalConversations: stat?.total_conversations || 0,
      closedConversations: stat?.resolved_conversations || 0,
      activeConversations: stat?.active_conversations || 0,
      conversations: [],
    }
  })

  const toggleAgentDetails = (agentId: number) => {
    setExpandedAgentId(expandedAgentId === agentId ? null : agentId)
  }

  return (
    <>
      <InboxHeader />
      <main className="flex-1 overflow-y-auto p-6 bg-background">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gestión de Agentes</h1>
              <p className="mt-1 text-muted-foreground">Administra tu equipo de soporte y monitorea su desempeño</p>
            </div>
            {role === "admin" && <AddAgentDialog />}
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Agentes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loadingAgents ? "-" : agents.length}</div>
                <p className="text-xs text-muted-foreground">
                  {loadingAgents ? "-" : agents.filter((a) => a.status === "available").length} en línea
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversaciones Activas</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agentStats.reduce((sum, a) => sum + a.activeConversations, 0)}</div>
                <p className="text-xs text-muted-foreground">Asignadas al equipo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa de Resolución</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87%</div>
                <p className="text-xs text-muted-foreground">+5% desde el mes pasado</p>
              </CardContent>
            </Card>
          </div>

          {/* Agents List */}
          <Card>
            <CardHeader>
              <CardTitle>Equipo de Agentes</CardTitle>
              <CardDescription>Lista completa de agentes y sus métricas de desempeño</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {error && (
                  <p className="text-sm text-destructive">Error al cargar agentes: {error}</p>
                )}
                {loadingAgents && !error && (
                  <p className="text-sm text-muted-foreground">Cargando agentes...</p>
                )}
                {!loadingAgents && agentStats.map((agent) => (
                  <div key={agent.id} className="space-y-0">
                    <div
                      className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                            {agent.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{agent.name}</h3>
                            {agent.status === "available" && (
                              <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50">
                                En línea
                              </Badge>
                            )}
                            {agent.status === "busy" && (
                              <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
                                Ausente
                              </Badge>
                            )}
                            {agent.status === "offline" && (
                              <Badge variant="outline" className="border-gray-400 text-gray-600 bg-gray-50">
                                Desconectado
                              </Badge>
                            )}
                            {agent.role === "admin" && (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                Admin
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {agent.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">{agent.activeConversations}</div>
                          <div className="text-xs text-muted-foreground">Activas</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">{agent.closedConversations}</div>
                          <div className="text-xs text-muted-foreground">Resueltas</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">{agent.totalConversations}</div>
                          <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                        {role === "admin" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleAgentDetails(agent.id)}
                          >
                            {expandedAgentId === agent.id ? (
                              <>
                                Ocultar <ChevronUp className="ml-2 h-4 w-4" />
                              </>
                            ) : (
                              <>
                                Ver Detalles <ChevronDown className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedAgentId === agent.id && (
                      <div className="border border-t-0 border-border rounded-b-lg p-4 bg-muted/30">
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Conversaciones Asignadas
                        </h4>
                        
                        {agent.conversations.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            No hay conversaciones asignadas a este agente
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {agent.conversations.map((conv) => (
                              <div
                                key={conv.id}
                                className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm">{conv.contact_name}</p>
                                    {conv.status === "open" && (
                                      <Badge variant="outline" className="text-xs border-green-500 text-green-700 bg-green-50">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Abierta
                                      </Badge>
                                    )}
                                    {conv.status === "closed" && (
                                      <Badge variant="outline" className="text-xs border-gray-500 text-gray-700 bg-gray-50">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Cerrada
                                      </Badge>
                                    )}
                                    {conv.priority === "high" && (
                                      <Badge variant="destructive" className="text-xs">
                                        Alta Prioridad
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {conv.phone_number}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">
                                    Última actividad: {new Date(conv.last_message_at).toLocaleDateString('es-ES', { 
                                      day: '2-digit', 
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
