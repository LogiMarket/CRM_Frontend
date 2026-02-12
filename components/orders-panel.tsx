"use client"

import { ConversationDetails } from "@/components/conversation-details"
import { useState } from "react"

interface OrdersPanelProps {
  conversationDetails?: any
  onUpdate?: () => void
  onAgentChange?: (agentId: string, agentName: string) => void
}

export function OrdersPanel({ conversationDetails, onUpdate, onAgentChange }: OrdersPanelProps) {
  const [currentAgentName, setCurrentAgentName] = useState(conversationDetails?.agent_name)

  const handleAgentChange = (agentId: string, agentName: string) => {
    setCurrentAgentName(agentName)
    onAgentChange?.(agentId, agentName)
  }

  return (
    <ConversationDetails
      conversationId={conversationDetails?.id}
      status={conversationDetails?.status}
      priority={conversationDetails?.priority}
      agent_name={conversationDetails?.agent_name || currentAgentName}
      created_at={conversationDetails?.created_at}
      last_message_at={conversationDetails?.last_message_at}
      contact_name={conversationDetails?.contact_name}
      phone_number={conversationDetails?.phone_number}
      onUpdate={onUpdate}
      onAgentChange={handleAgentChange}
    />
  )
}

export default OrdersPanel
