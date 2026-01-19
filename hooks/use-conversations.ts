"use client"

import { useState, useEffect, useCallback } from "react"

const POLL_INTERVAL = 5000 // 5s refresh in background

export interface Message {
  id: string
  content: string
  sender_type: "customer" | "agent"
  created_at: string
  conversation_id: string
}

export interface Conversation {
  id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  status: "active" | "resolved"
  priority: "low" | "medium" | "high"
  assigned_agent_id?: string
  last_message?: Message
  unread_count: number
  created_at: string
  updated_at: string
  channel?: string // whatsapp, facebook, etc
  external_user_id?: string // Facebook PSID or WhatsApp number
}

export function useConversations(onlyAssigned?: boolean) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Get current user ID from localStorage
  useEffect(() => {
    try {
      const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null
      if (userStr) {
        const user = JSON.parse(userStr)
        setUserId(user.id)
      }
    } catch (err) {
      console.error("Error parsing user from localStorage:", err)
    }
  }, [])

  const fetchConversations = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(false) // silent refresh
      }
      
      // Fetch from local Next.js API endpoint
      const response = await fetch(`/api/conversations`)

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`)
      }

      const rawData = await response.json()
      console.log("[useConversations] Raw data:", rawData)
      
      // Map backend response format to expected Conversation interface
      const conversationsArray = Array.isArray(rawData) ? rawData : (rawData.conversations || [])
      
      const mappedConversations: Conversation[] = conversationsArray.map((conv: any) => ({
        id: String(conv.id),
        customer_name: conv.contact_name || "Unknown",
        customer_phone: conv.phone_number || "",
        customer_email: undefined,
        status: (conv.status as "active" | "resolved") || "active",
        priority: (conv.priority as "low" | "medium" | "high") || "low",
        assigned_agent_id: conv.assigned_agent_id ? String(conv.assigned_agent_id) : undefined,
        channel: conv.channel || "whatsapp",
        external_user_id: conv.external_user_id,
        last_message: conv.last_message ? {
          id: "last",
          content: conv.last_message,
          sender_type: "customer" as const,
          created_at: conv.last_message_at || new Date().toISOString(),
          conversation_id: String(conv.id),
        } : undefined,
        unread_count: conv.unread_count || 0,
        created_at: conv.created_at || new Date().toISOString(),
        updated_at: conv.last_message_at || new Date().toISOString(),
      }))
      
      console.log("[useConversations] Mapped conversations:", mappedConversations)
      
      // Filter conversations if onlyAssigned is true and userId is available
      const filtered = onlyAssigned && userId 
        ? mappedConversations.filter((conv) => conv.assigned_agent_id === userId)
        : mappedConversations
      
      setConversations(filtered)
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      console.error("[useConversations] Error:", errorMessage, err)
      setError(errorMessage)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [onlyAssigned, userId])

  useEffect(() => {
    // Initial fetch
    fetchConversations(false)

    // Silent refresh on focus/visibility
    const handleFocus = () => fetchConversations(true)
    const handleVisibility = () => {
      if (!document.hidden) fetchConversations(true)
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibility)

    // Background polling (silent)
    const intervalId = setInterval(() => fetchConversations(true), POLL_INTERVAL)

    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibility)
      clearInterval(intervalId)
    }
  }, [fetchConversations])

  return { conversations, loading, refreshing, error, refetch: fetchConversations }
}
