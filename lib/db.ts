import postgres from "postgres"

let sql: ReturnType<typeof postgres> | null = null

if (process.env.DATABASE_URL) {
  sql = postgres(process.env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })
}

export const isDemoMode = !process.env.DATABASE_URL
export { sql }
