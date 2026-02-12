"use client"

import { ConversationDetails } from "@/components/conversation-details"
import { useEffect, useState } from "react"

interface OrdersPanelProps {
  conversationId?: number
  onUpdate?: () => void
}

export function OrdersPanel({ conversationId, onUpdate }: OrdersPanelProps) {
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!conversationId) {
      setDetails(null)
      return
    }

    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/conversations/${conversationId}`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setDetails(data)
      } catch {
        // best-effort panel
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [conversationId])

  return (
    <div className="h-full">
      {loading && (
        <div className="p-4 text-sm text-muted-foreground">Cargando detalles…</div>
      )}
      <ConversationDetails
        conversationId={conversationId}
        contactName={details?.contact_name ?? details?.contact?.name}
        contactPhone={details?.phone_number ?? details?.contact?.phone_number}
        status={details?.status}
        priority={details?.priority}
        agentName={details?.agent_name ?? details?.assigned_agent?.name}
        lastActivity={details?.last_message_at}
        onUpdate={onUpdate}
      />
    </div>
  )
}

export default OrdersPanel
