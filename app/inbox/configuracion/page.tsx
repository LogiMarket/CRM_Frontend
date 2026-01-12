import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, Lock, Save, Settings, Zap } from "lucide-react"
import { InboxHeader } from "@/components/inbox-header"

export default function ConfiguracionPage() {
  return (
    <>
      <InboxHeader />
      <main className="flex-1 overflow-y-auto p-6 bg-background">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
            <p className="mt-1 text-muted-foreground">
              Personaliza tu experiencia y ajusta las preferencias del sistema
            </p>
          </div>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
              <TabsTrigger value="integraciones">Integraciones</TabsTrigger>
              <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    <CardTitle>Configuración General</CardTitle>
                  </div>
                  <CardDescription>Ajusta las preferencias básicas del sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="empresa">Nombre de la Empresa</Label>
                    <Input id="empresa" placeholder="LogiMarket" defaultValue="LogiMarket" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Zona Horaria</Label>
                    <Input id="timezone" defaultValue="América/Ciudad de México" />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Tema Oscuro</Label>
                      <p className="text-sm text-muted-foreground">Activa el modo oscuro para la interfaz</p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sonidos de Notificación</Label>
                      <p className="text-sm text-muted-foreground">Reproduce sonido al recibir mensajes</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Respuestas Rápidas</Label>
                      <p className="text-sm text-muted-foreground">Habilitar sugerencias automáticas de respuesta</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Button className="gap-2">
                    <Save className="h-4 w-4" />
                    Guardar Cambios
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notificaciones" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    <CardTitle>Notificaciones</CardTitle>
                  </div>
                  <CardDescription>Controla cómo y cuándo recibes notificaciones</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificaciones de Email</Label>
                      <p className="text-sm text-muted-foreground">Recibe alertas por correo electrónico</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificaciones Push</Label>
                      <p className="text-sm text-muted-foreground">Recibe notificaciones en el navegador</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Nuevos Mensajes</Label>
                      <p className="text-sm text-muted-foreground">Notificar cuando llegan mensajes nuevos</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Asignación de Conversación</Label>
                      <p className="text-sm text-muted-foreground">Notificar cuando te asignan una conversación</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Menciones</Label>
                      <p className="text-sm text-muted-foreground">Notificar cuando te mencionan en notas internas</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Button className="gap-2">
                    <Save className="h-4 w-4" />
                    Guardar Preferencias
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integraciones" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    <CardTitle>Integraciones</CardTitle>
                  </div>
                  <CardDescription>Conecta servicios externos para extender funcionalidad</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="database">Base de Datos (Railway Postgres)</Label>
                    <Input
                      id="database"
                      type="password"
                      placeholder="postgresql://..."
                      defaultValue={process.env.DATABASE_URL ? "••••••••••••" : ""}
                    />
                    <p className="text-xs text-muted-foreground">
                      {process.env.DATABASE_URL
                        ? "✓ Conectado - Modo Demo Activo"
                        : "No configurado - Usando datos demo"}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium text-foreground">WhatsApp Business API</h3>
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp-token">Token de Acceso</Label>
                      <Input id="whatsapp-token" type="password" placeholder="EAAxxxxxx..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone-id">Phone Number ID</Label>
                      <Input id="phone-id" placeholder="123456789012345" />
                    </div>
                    <Button variant="outline">Conectar WhatsApp</Button>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium text-foreground">Webhooks</h3>
                    <div className="space-y-2">
                      <Label htmlFor="webhook-url">URL del Webhook</Label>
                      <Input id="webhook-url" placeholder="https://tu-dominio.com/webhook" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="webhook-secret">Secret</Label>
                      <Input id="webhook-secret" type="password" placeholder="webhook_secret_key" />
                    </div>
                    <Button variant="outline">Guardar Webhook</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seguridad" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    <CardTitle>Seguridad</CardTitle>
                  </div>
                  <CardDescription>Administra la seguridad de tu cuenta</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Contraseña Actual</Label>
                    <Input id="current-password" type="password" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nueva Contraseña</Label>
                    <Input id="new-password" type="password" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                    <Input id="confirm-password" type="password" />
                  </div>

                  <Button className="gap-2">
                    <Save className="h-4 w-4" />
                    Cambiar Contraseña
                  </Button>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Autenticación de Dos Factores</Label>
                      <p className="text-sm text-muted-foreground">Añade una capa extra de seguridad</p>
                    </div>
                    <Switch />
                  </div>

                  <Separator />

                  <div>
                    <h3 className="mb-2 font-medium text-foreground">Sesiones Activas</h3>
                    <div className="space-y-2 rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">Navegador Actual</p>
                          <p className="text-sm text-muted-foreground">Chrome en macOS • Activa ahora</p>
                        </div>
                        <Button variant="outline" size="sm" disabled>
                          Sesión Actual
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  )
}
