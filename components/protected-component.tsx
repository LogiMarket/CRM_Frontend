"use client"

import { ReactNode } from "react"
import { useUserRole } from "@/hooks/use-user-role"
import { canPerformAction, UserRole } from "@/lib/permissions"

interface ProtectedComponentProps {
  children: ReactNode
  requiredPermission: string
  fallback?: ReactNode
}

export function ProtectedComponent({
  children,
  requiredPermission,
  fallback = <div className="p-4 text-muted-foreground">No tienes permisos para ver este contenido</div>,
}: ProtectedComponentProps) {
  const { role } = useUserRole()

  if (!role) {
    return fallback
  }

  const hasPermission = canPerformAction(role as UserRole, requiredPermission as any)

  if (!hasPermission) {
    return fallback
  }

  return <>{children}</>
}
