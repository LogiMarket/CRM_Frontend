"use client"

import { useEffect, useState } from "react"
import { InboxHeader } from "@/components/inbox-header"
import { ConversationList } from "@/components/conversation-list"
import { ChatArea } from "@/components/chat-area"
import { OrdersPanel } from "@/components/orders-panel"

interface ConversationData {
  id: string
  status: string
  priority: string
  agent_name?: string
  created_at: string
  last_message_at: string
  contact_name: string
  phone_number: string
  contact_id: number
  assigned_agent_id?: number
}

export default function InboxPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string>()
  const [selectedContactName, setSelectedContactName] = useState<string>()
  const [selectedContactId, setSelectedContactId] = useState<number>()
  const [currentAgentId, setCurrentAgentId] = useState<number>()
  const [conversationDetails, setConversationDetails] = useState<ConversationData>()
  const [refreshKey, setRefreshKey] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [showOrdersPanel, setShowOrdersPanel] = useState(true)

  // Check screen size for responsive design
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      setShowOrdersPanel(window.innerWidth >= 1280)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Auto-select first conversation
  useEffect(() => {
    if (selectedConversationId) return

    const pickFirstConversation = async () => {
      try {
        const res = await fetch("/api/conversations")
        const data = await res.json()
        const first = data.conversations?.[0]
        if (first) {
          setSelectedConversationId(String(first.id))
          setSelectedContactName(first.contact_name)
          setSelectedContactId(first.contact_id)
          setCurrentAgentId(first.assigned_agent_id)
          setConversationDetails({
            id: String(first.id),
            status: first.status,
            priority: first.priority,
            agent_name: first.agent_name,
            created_at: first.created_at,
            last_message_at: first.last_message_at,
            contact_name: first.contact_name,
            phone_number: first.phone_number,
            contact_id: first.contact_id,
            assigned_agent_id: first.assigned_agent_id,
          })
        }
      } catch (error) {
        console.error("[inbox] Error auto-select:", error)
      }
    }

    pickFirstConversation()
  }, [selectedConversationId, refreshKey])

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id)
    fetch("/api/conversations")
      .then((res) => res.json())
      .then((data) => {
        const conv = data.conversations.find((c: any) => c.id === id || c.id === Number(id))
        if (conv) {
          setSelectedContactName(conv.contact_name)
          setSelectedContactId(conv.contact_id)
          setCurrentAgentId(conv.assigned_agent_id)
          setConversationDetails({
            id: String(conv.id),
            status: conv.status,
            priority: conv.priority,
            agent_name: conv.agent_name,
            created_at: conv.created_at,
            last_message_at: conv.last_message_at,
            contact_name: conv.contact_name,
            phone_number: conv.phone_number,
            contact_id: conv.contact_id,
            assigned_agent_id: conv.assigned_agent_id,
          })
        }
      })
  }

  const handleUpdate = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <>
      <InboxHeader />
      <div className="flex h-full flex-1 overflow-hidden gap-0">
        {/* Conversations list - responsive width */}
        <div className="hidden md:flex h-full w-full md:w-80 lg:w-96 flex-col border-r border-border bg-card flex-shrink-0">
          <ConversationList
            key={refreshKey}
            selectedId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* Chat area - flex grow */}
        <div className="flex flex-1 flex-col min-w-0">
          <ChatArea
            conversationId={selectedConversationId}
            contactName={selectedContactName}
            currentAgentId={currentAgentId}
            onUpdate={handleUpdate}
          />
        </div>

        {/* Orders/Details panel - responsive */}
        {showOrdersPanel && (
          <div className="hidden xl:flex h-full w-full xl:w-96 2xl:w-[28rem] flex-col border-l border-border bg-card flex-shrink-0 overflow-hidden">
              <OrdersPanel 
                conversationDetails={conversationDetails}
                onUpdate={handleUpdate}
              />
          </div>
        )}
      </div>
    </>
  )
}
