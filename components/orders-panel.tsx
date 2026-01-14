+"use client"
+
+import { ConversationDetails } from "@/components/conversation-details"
+
+interface OrdersPanelProps {
+  conversationDetails?: any
+  onUpdate?: () => void
+}
+
+export function OrdersPanel({ conversationDetails, onUpdate }: OrdersPanelProps) {
+  return (
+    <ConversationDetails
+      conversationId={conversationDetails?.id}
+      status={conversationDetails?.status}
+      priority={conversationDetails?.priority}
+      agent_name={conversationDetails?.agent_name}
+      created_at={conversationDetails?.created_at}
+      last_message_at={conversationDetails?.last_message_at}
+      contact_name={conversationDetails?.contact_name}
+      phone_number={conversationDetails?.phone_number}
+      onUpdate={onUpdate}
+    />
+  )
+}
+
+export default OrdersPanel
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700"
      case "shipped":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300 dark:border-orange-700"
      case "delivered":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-300"
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pendiente",
      processing: "Procesando",
      shipped: "Enviado",
      delivered: "Entregado",
      cancelled: "Cancelado",
    }
    return labels[status] || status
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Conversation Details */}
      {conversationDetails && (
        <div className="border-b border-border bg-gradient-to-r from-primary/5 to-primary/10 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">Detalles de la Conversación</h2>
          </div>
          <div className="grid gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estatus:</span>
              <Badge variant="outline" className="capitalize">{conversationDetails.status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prioridad:</span>
              <Badge className="capitalize">{conversationDetails.priority}</Badge>
            </div>
            {conversationDetails.agent_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agente:</span>
                <span className="font-medium text-foreground">{conversationDetails.agent_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Iniciada:</span>
              <span className="text-foreground">
                {conversationDetails.created_at
                  ? format(new Date(conversationDetails.created_at), "dd MMM HH:mm", { locale: es })
                  : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Último mensaje:</span>
              <span className="text-foreground">
                {conversationDetails.last_message_at
                  ? format(new Date(conversationDetails.last_message_at), "HH:mm", { locale: es })
                  : "-"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border bg-card p-4">
        <h2 className="mb-3 font-semibold text-lg text-foreground">Órdenes</h2>
        <div className="relative">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número de orden..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 transition-all focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Orders List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {loading ? (
            <p className="text-center text-muted-foreground text-sm">Cargando órdenes...</p>
          ) : orders.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm">No se encontraron órdenes</p>
          ) : (
            orders.map((order, index) => (
              <Card
                key={order.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:bg-accent hover:shadow-md animate-fade-in-up",
                  selectedOrder?.id === order.id && "border-primary border-2 bg-primary/5 shadow-md",
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => setSelectedOrder(order)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm text-foreground font-semibold">{order.order_number}</CardTitle>
                      <CardDescription className="text-xs">{order.contact_name}</CardDescription>
                    </div>
                    <Badge className={cn("gap-1 font-medium text-xs", getStatusColor(order.status))}>
                      {getStatusIcon(order.status)}
                      {getStatusLabel(order.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-foreground">
                      ${(order.total_amount || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {order.created_at
                        ? format(new Date(order.created_at), "dd MMM yyyy", { locale: es })
                        : "Sin fecha"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Order Details */}
      {selectedOrder && (
        <>
          <Separator />
          <div className="border-t border-border bg-card p-4 animate-fade-in-up">
            <h3 className="mb-3 font-semibold text-sm text-foreground">Detalles de la Orden</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="mb-1 text-muted-foreground text-xs font-medium">Productos</p>
                <div className="space-y-2">
                  {(selectedOrder.items || []).map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex justify-between rounded-md bg-muted p-2 transition-colors hover:bg-accent"
                    >
                      <span className="text-xs text-foreground">
                        {item.name} x{item.quantity}
                      </span>
                      <span className="font-medium text-xs text-foreground">${item.price || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-muted-foreground text-xs font-medium">Dirección de Envío</p>
                <p className="text-xs text-foreground">{selectedOrder.shipping_address || "No especificada"}</p>
              </div>
              <div>
                <p className="mb-1 text-muted-foreground text-xs font-medium">Total</p>
                <p className="font-semibold text-foreground">
                  ${(selectedOrder.total_amount || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
