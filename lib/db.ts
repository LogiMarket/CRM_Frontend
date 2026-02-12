import postgres from "postgres"

type SqlClient = ReturnType<typeof postgres>

function createThrowingSqlClient(): SqlClient {
  const throwDbNotConfigured = () => {
    throw new Error("DATABASE_URL is not set. Configure DATABASE_URL to use the database.")
  }

  // Callable (tagged template) + property access compatible.
  return new Proxy(throwDbNotConfigured as any, {
    apply() {
      throwDbNotConfigured()
    },
    get(_target, prop) {
      // Some codepaths may call sql.end(); in demo mode this should be a no-op.
      if (prop === "end") return async () => {}
      return throwDbNotConfigured
    },
  }) as any
}

export const hasDatabase = Boolean(process.env.DATABASE_URL)
export const isDemoMode = !hasDatabase

export const sql: SqlClient = hasDatabase
  ? postgres(process.env.DATABASE_URL as string, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  : createThrowingSqlClient()
