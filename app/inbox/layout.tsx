import type React from "react"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { InboxSidebar } from "@/components/inbox-sidebar"

export default async function InboxLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <InboxSidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}
