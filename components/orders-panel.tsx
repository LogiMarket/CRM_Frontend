"use client"

import { ConversationDetails } from "@/components/conversation-details"
import { useMemo } from "react"

interface OrdersPanelProps {
  conversationDetails?: any
  contactId?: number
  onUpdate?: () => void
  onAgentChange?: (agentId: string, agentName: string) => void
}

export function OrdersPanel({ conversationDetails, onUpdate }: OrdersPanelProps) {
  const agentName = useMemo(() => {
    return conversationDetails?.agent_name ?? conversationDetails?.assigned_agent?.name
  }, [conversationDetails])

  return (
    <ConversationDetails
      conversationId={conversationDetails?.id}
      status={conversationDetails?.status}
      priority={conversationDetails?.priority}
      agentName={agentName}
      lastActivity={conversationDetails?.last_message_at}
      contactName={conversationDetails?.contact_name}
      contactPhone={conversationDetails?.phone_number}
      onUpdate={onUpdate}
    />
  )
}

export default OrdersPanel
