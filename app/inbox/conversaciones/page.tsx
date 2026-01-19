"use client"

import { useState, useEffect } from "react"
import { InboxHeader } from "@/components/inbox-header"
import { ConversationList } from "@/components/conversation-list"
import { ChatArea } from "@/components/chat-area"
import { OrdersPanel } from "@/components/orders-panel"
import { useUserRole } from "@/hooks/use-user-role"

export default function ConversacionesPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<number>()
  const [selectedContactName, setSelectedContactName] = useState<string>()
  const [selectedContactId, setSelectedContactId] = useState<number>()
  const [currentAgentId, setCurrentAgentId] = useState<number>()
  const [selectedChannel, setSelectedChannel] = useState<string>('whatsapp')
  const [selectedExternalUserId, setSelectedExternalUserId] = useState<string>()
  const [refreshKey, setRefreshKey] = useState(0)
  const { role } = useUserRole()
  
  // Agentes solo ven conversaciones asignadas
  const onlyAssigned = role === "agent"

  const handleSelectConversation = (id: number) => {
    setSelectedConversationId(id)
    fetch(`/api/conversations`)
      .then((res) => res.json())
      .then((data) => {
        const conv = data.conversations.find((c: any) => c.id === id)
        if (conv) {
          setSelectedContactName(conv.contact_name)
          setSelectedContactId(conv.contact_id)
          setCurrentAgentId(conv.assigned_agent_id)
          setSelectedChannel(conv.channel || 'whatsapp')
          setSelectedExternalUserId(conv.external_user_id)
        }
      })
  }

  const handleUpdate = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <>
      <InboxHeader />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex h-full w-96 flex-col border-r border-border bg-card">
          <ConversationList
            key={refreshKey}
            selectedId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            onlyAssigned={onlyAssigned}
          />
        </div>

        <div className="flex flex-1 flex-col">
          <ChatArea
            conversationId={selectedConversationId}
            contactName={selectedContactName}
            currentAgentId={currentAgentId}
            channel={selectedChannel}
            externalUserId={selectedExternalUserId}
            onUpdate={handleUpdate}
          />
        </div>

        <div className="flex h-full w-96 flex-col border-l border-border bg-card">
          <OrdersPanel contactId={selectedContactId} />
        </div>
      </div>
    </>
  )
}
