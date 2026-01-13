"use client"

import { useState, useEffect, useCallback } from "react"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://crmbackend-production-4e4d.up.railway.app"
const POLL_INTERVAL = 5000 // 5 seconds

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
  status: "open" | "assigned" | "resolved"
  priority: "low" | "medium" | "high"
  assigned_agent_id?: string
  last_message?: Message
  unread_count: number
  created_at: string
  updated_at: string
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
        setRefreshing(true)
      }
      
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
      
      if (!token) {
        setError("No authentication token found")
        return
      }

      const response = await fetch(`${BACKEND_URL}/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch conversations")
      }

      let data = await response.json()
      
      // Filter conversations if onlyAssigned is true and userId is available
      if (onlyAssigned && userId) {
        data = data.filter((conv: Conversation) => conv.assigned_agent_id === userId)
      }
      
      setConversations(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [onlyAssigned, userId])

  useEffect(() => {
    // Initial fetch
    fetchConversations(false)

    // Set up polling
    const intervalId = setInterval(() => fetchConversations(true), POLL_INTERVAL)

    // Cleanup
    return () => clearInterval(intervalId)
  }, [fetchConversations])

  return { conversations, loading, refreshing, error, refetch: fetchConversations }
}
