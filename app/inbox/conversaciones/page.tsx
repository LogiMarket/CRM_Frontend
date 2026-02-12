"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { InboxHeader } from "@/components/inbox-header"
import { ConversationList } from "@/components/conversation-list"
import { ChatArea } from "@/components/chat-area"
import { OrdersPanel } from "@/components/orders-panel"
import { useUserRole } from "@/hooks/use-user-role"

export default function ConversacionesPage() {
  const searchParams = useSearchParams()
  const [selectedConversationId, setSelectedConversationId] = useState<string>()
  const [selectedContactName, setSelectedContactName] = useState<string>()
  const [selectedContactId, setSelectedContactId] = useState<number>()
  const [currentAgentId, setCurrentAgentId] = useState<number>()
  const [selectedChannel, setSelectedChannel] = useState<string>('whatsapp')
  const [selectedExternalUserId, setSelectedExternalUserId] = useState<string>()
  const [refreshKey, setRefreshKey] = useState(0)
  const { role } = useUserRole()
  
  // Agentes solo ven conversaciones asignadas
  const onlyAssigned = role === "agent"

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id)
    fetch(`/api/conversations`)
      .then((res) => res.json())
      .then((data) => {
        const conv = (data.conversations || []).find((c: any) => String(c.id) === String(id))
        if (conv) {
          setSelectedContactName(conv.contact_name)
          setSelectedContactId(conv.contact_id)
          setCurrentAgentId(conv.assigned_agent_id)
          setSelectedChannel(conv.channel || 'whatsapp')
          setSelectedExternalUserId(conv.external_user_id)
        }
      })
  }, [])

  // Si llegamos desde Contactos con ?conversationId=..., seleccionarla automáticamente.
  useEffect(() => {
    const id = searchParams.get("conversationId")
    if (!id) return
    if (String(selectedConversationId || "") === String(id)) return
    handleSelectConversation(String(id))
  }, [handleSelectConversation, searchParams, selectedConversationId])

  const handleUpdate = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const handleConversationDeleted = () => {
    setSelectedConversationId(undefined)
    setSelectedContactName(undefined)
    setSelectedContactId(undefined)
    setCurrentAgentId(undefined)
    setSelectedChannel('whatsapp')
    setSelectedExternalUserId(undefined)
  }

  return (
    <>
      <InboxHeader />
      <div className="flex flex-1 overflow-hidden gap-0">
        <div className="flex h-full w-96 flex-col border-r border-border bg-card flex-shrink-0">
          <ConversationList
            key={refreshKey}
            selectedId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            onlyAssigned={onlyAssigned}
          />
        </div>

        {/* Visual spacer between panels */}
        <div className="w-4 flex-shrink-0 bg-muted/40" aria-hidden="true" />

        <div className="flex flex-1 flex-col min-w-0">
          <ChatArea
            conversationId={selectedConversationId}
            contactName={selectedContactName}
            currentAgentId={currentAgentId}
            channel={selectedChannel}
            externalUserId={selectedExternalUserId}
            onUpdate={handleUpdate}
            onConversationDeleted={handleConversationDeleted}
          />
        </div>

        {/* Visual spacer between panels */}
        <div className="w-4 flex-shrink-0 bg-muted/40" aria-hidden="true" />

        <div className="flex h-full w-72 flex-col border-l border-border bg-card flex-shrink-0">
          <OrdersPanel contactId={selectedContactId} />
        </div>
      </div>
    </>
  )
}
