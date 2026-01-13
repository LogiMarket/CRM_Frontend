"use client"

export type UserRole = "admin" | "supervisor" | "agent"

export interface Permission {
  viewConversations: boolean
  assignConversations: boolean
  manageAgents: boolean
  createAgents: boolean
  deleteAgents: boolean
  editAgents: boolean
  viewConfiguration: boolean
  editConfiguration: boolean
  viewAgentsTab: boolean
}

export function getPermissions(role: UserRole): Permission {
  const permissions: Record<UserRole, Permission> = {
    admin: {
      viewConversations: true,
      assignConversations: true,
      manageAgents: true,
      createAgents: true,
      deleteAgents: true,
      editAgents: true,
      viewConfiguration: true,
      editConfiguration: true,
      viewAgentsTab: true,
    },
    supervisor: {
      viewConversations: true,
      assignConversations: true,
      manageAgents: true,
      createAgents: false,
      deleteAgents: false,
      editAgents: true,
      viewConfiguration: true,
      editConfiguration: false,
      viewAgentsTab: true,
    },
    agent: {
      viewConversations: true,
      assignConversations: true,
      manageAgents: false,
      createAgents: false,
      deleteAgents: false,
      editAgents: false,
      viewConfiguration: true,
      editConfiguration: false,
      viewAgentsTab: false,
    },
  }

  return permissions[role] || permissions.agent
}

export function canPerformAction(role: UserRole, action: keyof Permission): boolean {
  const permissions = getPermissions(role)
  return permissions[action] ?? false
}
