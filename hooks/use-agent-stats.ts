"use client"

import { useState, useEffect } from "react"

export interface AgentStats {
  id: string
  name: string
  email: string
  role: string
  active_conversations: number
  resolved_conversations: number
  total_conversations: number
}

export function useAgentStats() {
  const [stats, setStats] = useState<AgentStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/users/agents/stats`)

      if (!response.ok) {
        throw new Error(`Failed to fetch agent stats: ${response.status}`)
      }

      const data = await response.json()
      setStats(data.agents || [])
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      console.error("[useAgentStats] Error:", errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return { stats, loading, error, refetch: fetchStats }
}
