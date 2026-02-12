import postgres from "postgres"

export const isDemoMode = !process.env.DATABASE_URL

// Keep `sql` always callable for TypeScript, even in demo mode.
// In demo mode it throws if used, so routes should guard with `isDemoMode`.
export const sql: ReturnType<typeof postgres> = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  : (((() => {
      throw new Error("Database is not configured (DATABASE_URL missing)")
    }) as unknown) as ReturnType<typeof postgres>)
