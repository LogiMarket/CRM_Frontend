"use client"

import { MessageSquare, Users, Settings, LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"

interface InboxSidebarProps {
  user: {
    name: string
    email: string
    status: string
  }
}

export function InboxSidebar({ user }: InboxSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const isInbox = pathname === "/inbox"
  const isAgentes = pathname.startsWith("/inbox/agentes")
  const isConfiguracion = pathname.startsWith("/inbox/configuracion")

  return (
    <div
      className={cn(
        "flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <Image src="/logimarket-logo.png" alt="LogiMarket" width={140} height={40} className="h-auto w-32" />
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground"
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        <Button
          variant="ghost"
          onClick={() => router.push("/inbox")}
          className={cn(
            "w-full justify-start transition-colors",
            collapsed && "justify-center px-2",
            isInbox
              ? "bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              : "text-foreground hover:bg-sidebar-accent hover:text-foreground",
          )}
        >
          <MessageSquare className="h-5 w-5" />
          {!collapsed && <span className="ml-3">Conversaciones</span>}
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push("/inbox/agentes")}
          className={cn(
            "w-full justify-start transition-colors",
            collapsed && "justify-center px-2",
            isAgentes
              ? "bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              : "text-foreground hover:bg-sidebar-accent hover:text-foreground",
          )}
        >
          <Users className="h-5 w-5" />
          {!collapsed && <span className="ml-3">Agentes</span>}
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push("/inbox/configuracion")}
          className={cn(
            "w-full justify-start transition-colors",
            collapsed && "justify-center px-2",
            isConfiguracion
              ? "bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              : "text-foreground hover:bg-sidebar-accent hover:text-foreground",
          )}
        >
          <Settings className="h-5 w-5" />
          {!collapsed && <span className="ml-3">Configuración</span>}
        </Button>
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* User Profile */}
      <div className="p-4">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate font-medium text-foreground text-sm">{user.name}</p>
              <p className="truncate text-muted-foreground text-xs">{user.status}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-start text-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        )}
      </div>
    </div>
  )
}
