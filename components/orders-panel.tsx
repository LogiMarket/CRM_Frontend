"use client"

import { useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Package, Truck, CheckCircle, Clock, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Separator } from "@/components/ui/separator"

interface Order {
  id: number
  order_number: string
  status: string
  total_amount: number
  items: any[]
  shipping_address: string
  created_at: string
  contact_name: string
  phone_number: string
}

interface OrdersPanelProps {
  contactId?: number
}

export function OrdersPanel({ contactId }: OrdersPanelProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [contactId, search])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (contactId) {
        params.append("contactId", contactId.toString())
      }
      if (search) {
        params.append("search", search)
      }

      const response = await fetch(`/api/orders?${params}`)
      const data = await response.json()
      setOrders(data.orders || [])

      // Auto-select first order if contactId is provided
      if (contactId && data.orders?.length > 0) {
        setSelectedOrder(data.orders[0])
      }
    } catch (error) {
      console.error("[v0] Fetch orders error:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "processing":
        return <Package className="h-4 w-4" />
      case "shipped":
        return <Truck className="h-4 w-4" />
      case "delivered":
        return <CheckCircle className="h-4 w-4" />
      case "cancelled":
        return <XCircle className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
      case "processing":
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
    <div className="flex h-full flex-col">
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
