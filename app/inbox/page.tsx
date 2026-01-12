"use client"

import { useState } from "react"
import { InboxHeader } from "@/components/inbox-header"
import { ConversationList } from "@/components/conversation-list"
import { ChatArea } from "@/components/chat-area"
import { OrdersPanel } from "@/components/orders-panel"

export default function InboxPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<number>()
  const [selectedContactName, setSelectedContactName] = useState<string>()
  const [selectedContactId, setSelectedContactId] = useState<number>()
  const [currentAgentId, setCurrentAgentId] = useState<number>() // Added to track assigned agent
  const [refreshKey, setRefreshKey] = useState(0) // Added to force refresh

  const handleSelectConversation = (id: number) => {
    setSelectedConversationId(id)
    // Fetch conversation details to get contact info
    fetch(`/api/conversations`)
      .then((res) => res.json())
      .then((data) => {
        const conv = data.conversations.find((c: any) => c.id === id)
        if (conv) {
          setSelectedContactName(conv.contact_name)
          setSelectedContactId(conv.contact_id)
          setCurrentAgentId(conv.assigned_agent_id) // Set current agent
        }
      })
  }

  const handleUpdate = () => {
    setRefreshKey((prev) => prev + 1) // Force refresh conversations
  }

  return (
    <>
      <InboxHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Conversations list */}
        <div className="flex h-full w-96 flex-col border-r border-border bg-card">
          <ConversationList
            key={refreshKey}
            selectedId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* Chat area */}
        <div className="flex flex-1 flex-col">
          <ChatArea
            conversationId={selectedConversationId}
            contactName={selectedContactName}
            currentAgentId={currentAgentId}
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
