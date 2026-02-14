"use client"

import { useCallback, useEffect, useState } from "react"

export interface Contact {
  id: number | string
  name: string
  phone_number: string
  avatar_url?: string | null
  channel?: string | null
  external_user_id?: string | null
  created_at?: string
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts", { cache: "no-store" })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || `Failed to fetch contacts: ${res.status}`)
      if (data === null) throw new Error("Invalid response from /api/contacts")

      const list = Array.isArray(data) ? data : (data?.contacts || [])
      setContacts(list)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error fetching contacts")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchContacts()
  }, [fetchContacts])

  return { contacts, loading, error, refetch: fetchContacts }
}
