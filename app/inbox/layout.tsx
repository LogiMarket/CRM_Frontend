import type React from "react"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import InboxSidebarClient from "@/components/InboxSidebarClient"

export default async function InboxLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();

  if (!user || !user.name || !user.email || !user.status) {
    redirect("/login");
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <InboxSidebarClient user={user} />
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
