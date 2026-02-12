import bcrypt from "bcryptjs"
import { sql } from "./db"
import { isDemoMode } from "./db"
import { DEMO_USERS } from "./demo-data"

export interface User {
  id: number
  email: string
  name: string
  role: string
  avatar_url?: string
  status: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (isDemoMode) {
    const demoUser = DEMO_USERS.find((u) => u.email === email)
    if (demoUser) {
      const { password_hash, ...userWithoutPassword } = demoUser
      return userWithoutPassword
    }
    return null
  }

  const users = await sql`
    SELECT id, email, name, role, avatar_url, status
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `
  return users.length > 0 ? users[0] : null
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  if (isDemoMode) {
    console.log("[v0] Demo mode: authenticating", email)
    const demoUser = DEMO_USERS.find((u) => u.email === email)
    if (!demoUser) {
      console.log("[v0] Demo user not found")
      return null
    }

    const isValid = demoUser.password === password
    console.log("[v0] Password check:", isValid)

    if (!isValid) {
      return null
    }

    const { password: _, ...userWithoutPassword } = demoUser
    return userWithoutPassword
  }

  const users = await sql`
    SELECT id, email, password_hash, name, role, avatar_url, status
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `

  if (users.length === 0) {
    return null
  }

  const user = users[0]
  const isValid = await verifyPassword(password, user.password_hash)

  if (!isValid) {
    return null
  }

  // Return user without password_hash
  const { password_hash, ...userWithoutPassword } = user
  return userWithoutPassword
}
