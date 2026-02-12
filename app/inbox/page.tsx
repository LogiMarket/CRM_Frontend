"use client"

import { useEffect, useState } from "react"
import { InboxHeader } from "@/components/inbox-header"
import { ConversationList } from "@/components/conversation-list"
import { ChatArea } from "@/components/chat-area"
import { OrdersPanel } from "@/components/orders-panel"

export default function InboxPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<number>()
  const [selectedContactName, setSelectedContactName] = useState<string>()
  const [selectedContactId, setSelectedContactId] = useState<number>()
  const [currentAgentId, setCurrentAgentId] = useState<number>()
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
          setSelectedConversationId(Number(first.id))
          setSelectedContactName(first.contact_name)
          setSelectedContactId(first.contact_id)
          setCurrentAgentId(first.assigned_agent_id)
        }
      } catch (error) {
        console.error("[inbox] Error auto-select:", error)
      }
    }

    pickFirstConversation()
  }, [selectedConversationId, refreshKey])

  const handleSelectConversation = (id: number) => {
    setSelectedConversationId(id)
    fetch("/api/conversations")
      .then((res) => res.json())
      .then((data) => {
        const conv = (data.conversations || []).find((c: any) => Number(c.id) === id)
        if (conv) {
          setSelectedContactName(conv.contact_name)
          setSelectedContactId(conv.contact_id)
          setCurrentAgentId(conv.assigned_agent_id)
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
              <OrdersPanel conversationId={selectedConversationId} onUpdate={handleUpdate} />
          </div>
        )}
      </div>
    </>
  )
}
