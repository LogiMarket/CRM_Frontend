"use client"

import { useState, useEffect } from "react"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://crmbackend-production-4e4d.up.railway.app"

export interface Agent {
  id: string
  name: string
  email: string
  role: "agent" | "admin"
  status?: "available" | "busy" | "offline"
  created_at: string
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgents = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
      
      if (!token) {
        setError("No authentication token found")
        return
      }

      const response = await fetch(`${BACKEND_URL}/api/users/agents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch agents")
      }

      const data = await response.json()
      const mapped: Agent[] = (data || []).map((u: any) => ({
        id: u.id,
        name: u.name || u.full_name || u.email,
        email: u.email,
        role: u.role?.name === 'Administrador' ? 'admin' : 'agent',
        status: (u.status as any) || 'offline',
        created_at: u.created_at,
      }))
      setAgents(mapped)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  return { agents, loading, error, refetch: fetchAgents }
}
