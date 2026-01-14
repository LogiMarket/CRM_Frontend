"use client"

import { useState, useEffect } from "react"

export interface Agent {
  id: string
  name: string
  email: string
  role: "agent" | "admin" | "supervisor"
  status?: "available" | "busy" | "offline"
  created_at?: string
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgents = async () => {
    try {
      const response = await fetch(`/api/users/agents`)

      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.status}`)
      }

      const data = await response.json()
      const mapped: Agent[] = (Array.isArray(data) ? data : data.agents || []).map((u: any) => {
        // Normalize role from Spanish/English to English format
        let role: "agent" | "admin" | "supervisor" = "agent"
        const roleName = u.role?.name || u.role // Handle both object and string formats
        
        if (roleName === "Administrador" || roleName === "admin") {
          role = "admin"
        } else if (roleName === "Supervisor" || roleName === "super") {
          role = "supervisor"
        }
        
        return {
          id: String(u.id),
          name: u.name || u.full_name || u.email,
          email: u.email,
          role,
          status: u.status || "offline",
          created_at: u.created_at,
        }
      })
      setAgents(mapped)
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      console.error("[useAgents] Error:", errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  return { agents, loading, error, refetch: fetchAgents }
}
