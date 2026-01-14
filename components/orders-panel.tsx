"use client"

import { ConversationDetails } from "@/components/conversation-details"

interface OrdersPanelProps {
  conversationDetails?: any
  onUpdate?: () => void
}

export function OrdersPanel({ conversationDetails, onUpdate }: OrdersPanelProps) {
  return (
    <ConversationDetails
      conversationId={conversationDetails?.id}
      status={conversationDetails?.status}
      priority={conversationDetails?.priority}
      agent_name={conversationDetails?.agent_name}
      created_at={conversationDetails?.created_at}
      last_message_at={conversationDetails?.last_message_at}
      contact_name={conversationDetails?.contact_name}
      phone_number={conversationDetails?.phone_number}
      onUpdate={onUpdate}
    />
  )
}

export default OrdersPanel
