import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserPlus, MessageSquare, TrendingUp, Mail } from "lucide-react"
import { DEMO_DATA } from "@/lib/demo-data"
import { InboxHeader } from "@/components/inbox-header"

export default function AgentesPage() {
  // Get agents from demo data
  const agents = DEMO_DATA.users.filter((u) => u.role === "agent" || u.role === "admin")

  // Calculate stats per agent
  const agentStats = agents.map((agent) => {
    const assignedConversations = DEMO_DATA.conversations.filter((c) => c.assigned_to === agent.id)
    const closedConversations = assignedConversations.filter((c) => c.status === "closed")

    return {
      ...agent,
      totalConversations: assignedConversations.length,
      closedConversations: closedConversations.length,
      activeConversations: assignedConversations.length - closedConversations.length,
    }
  })

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
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Agregar Agente
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Agentes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agents.length}</div>
                <p className="text-xs text-muted-foreground">
                  {agents.filter((a) => a.status === "online").length} en línea
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversaciones Activas</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {agentStats.reduce((sum, a) => sum + a.activeConversations, 0)}
                </div>
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
                {agentStats.map((agent) => (
                  <div
                    key={agent.id}
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
                          {agent.status === "online" && (
                            <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50">
                              En línea
                            </Badge>
                          )}
                          {agent.status === "away" && (
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
                      <Button variant="outline" size="sm">
                        Ver Detalles
                      </Button>
                    </div>
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
