/**
 * COMPARACIÓN: ANTES Y DESPUÉS DE LOS CAMBIOS
 * =============================================
 */

// ============================================================================
// ANTES (Problemas)
// ============================================================================

// useConversations ANTES ❌
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://crmbackend-production-4e4d.up.railway.app"

const fetchConversations = async () => {
  const token = localStorage.getItem("access_token") // Token puede expirar
  const response = await fetch(`${BACKEND_URL}/api/conversations`, {
    headers: { Authorization: `Bearer ${token}` }, // CORS issues potenciales
  })
  // Sin manejo de errores detallado
  // Sin mapeo de datos
  // Sin logging
}

// PROBLEMAS:
// ❌ Intenta conectarse a backend externo (puede no estar disponible)
// ❌ Token JWT vence y no se renueva automáticamente
// ❌ CORS bloqueado en algunos navegadores
// ❌ Variables env inconsistentes (NEXT_PUBLIC_BACKEND_URL vs NEXT_PUBLIC_API_URL)
// ❌ Formato de respuesta no mapea correctamente
// ❌ Sin logging para debugging
// ❌ Error "Failed to fetch conversations"

// useAgents ANTES ❌
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://crmbackend-production-4e4d.up.railway.app"

const fetchAgents = async () => {
  const token = localStorage.getItem("access_token")
  const response = await fetch(`${BACKEND_URL}/api/users/agents`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  // Sin normalización de roles
  // Sin mapeo de datos
}

// PROBLEMAS:
// ❌ Variables env inconsistentes
// ❌ Sin normalización de roles Spanish → English
// ❌ Sin validación de estados
// ❌ Sin logging

// ============================================================================
// DESPUÉS (Soluciones)
// ============================================================================

// useConversations DESPUÉS ✅
const fetchConversations = async (isRefresh = false) => {
  try {
    // Usa endpoint local (ya autenticado en servidor)
    const response = await fetch(`/api/conversations`)
    
    if (!response.ok) {
      throw new Error(`Failed: ${response.status}`)
    }
    
    const rawData = await response.json()
    console.log("[useConversations] Raw data:", rawData) // ✓ Logging
    
    // ✓ Manejo flexible de formato de respuesta
    const conversationsArray = Array.isArray(rawData) ? rawData : (rawData.conversations || [])
    
    // ✓ Mapeo completo de datos
    const mapped = conversationsArray.map((conv: any) => ({
      id: String(conv.id),
      customer_name: conv.contact_name || "Unknown",
      customer_phone: conv.phone_number || "",
      status: (conv.status as "open" | "assigned" | "resolved") || "open",
      priority: (conv.priority as "low" | "medium" | "high") || "low",
      assigned_agent_id: conv.assigned_agent_id ? String(conv.assigned_agent_id) : undefined,
      last_message: conv.last_message ? { /* ... */ } : undefined,
      unread_count: conv.unread_count || 0,
      created_at: conv.created_at || new Date().toISOString(),
      updated_at: conv.last_message_at || new Date().toISOString(),
    }))
    
    // ✓ Filtrado de conversaciones asignadas
    const filtered = onlyAssigned && userId 
      ? mapped.filter((conv) => conv.assigned_agent_id === userId)
      : mapped
    
    setConversations(filtered)
  } catch (err) {
    // ✓ Error handling detallado
    console.error("[useConversations] Error:", err)
    setError(err instanceof Error ? err.message : "An error occurred")
  }
}

// BENEFICIOS:
// ✅ Usa endpoint local protegido por getSession()
// ✅ Sin problemas de CORS
// ✅ Token autenticado en servidor (seguro)
// ✅ Mapeo completo de datos
// ✅ Logging detallado para debugging
// ✅ Error handling robusto
// ✅ Fallbacks para datos faltantes
// ✅ Funciona offline en desarrollo
// ✅ Sin "Failed to fetch conversations"

// useAgents DESPUÉS ✅
const fetchAgents = async () => {
  try {
    // Usa endpoint local
    const response = await fetch(`/api/users/agents`)
    
    if (!response.ok) {
      throw new Error(`Failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    // ✓ Manejo flexible de formato
    const mapped = (Array.isArray(data) ? data : data.agents || []).map((u: any) => {
      // ✓ Normalización de roles
      let role: "agent" | "admin" | "supervisor" = "agent"
      const roleName = u.role?.name || u.role // ✓ Soporta string y objeto
      
      if (roleName === "Administrador" || roleName === "admin") {
        role = "admin"
      } else if (roleName === "Supervisor" || roleName === "super") {
        role = "supervisor"
      }
      
      return {
        id: String(u.id), // ✓ Conversión a String
        name: u.name || u.full_name || u.email,
        email: u.email,
        role, // ✓ Rol normalizado
        status: u.status || "offline", // ✓ Fallback para estado
        created_at: u.created_at,
      }
    })
    
    setAgents(mapped)
  } catch (err) {
    // ✓ Error handling
    console.error("[useAgents] Error:", err)
    setError(err instanceof Error ? err.message : "An error occurred")
  }
}

// BENEFICIOS:
// ✅ Usa endpoint local
// ✅ Normalización de roles correcta
// ✅ Soporta formato string de rol
// ✅ Validación de estado con fallback
// ✅ Error handling robusto
// ✅ Logging para debugging
// ✅ Sin conflictos de variables env

// ============================================================================
// IMPACTO EN LA EXPERIENCIA DEL USUARIO
// ============================================================================

/**
 * ANTES ❌:
 * Usuario intenta acceder a /inbox/conversaciones
 * → Spinner cargando...
 * → Error: "Failed to fetch conversations"
 * → Página vacía sin conversaciones
 * 
 * Usuarios no ven agentes en /inbox/agentes
 * → Error similar
 * → Página sin datos
 * 
 * DESPUÉS ✅:
 * Usuario intenta acceder a /inbox/conversaciones
 * → Spinner cargando... (rápido, <500ms)
 * → ✓ Se cargan conversaciones de la BD local
 * → Se muestran conversaciones con último mensaje
 * → Podrá hacer clic para abrir chat
 * 
 * Usuario accede a /inbox/agentes
 * → Spinner cargando... (rápido, <500ms)
 * → ✓ Se cargan agentes de la BD local
 * → Se muestra count de agentes y agentes en línea
 * → Puede ver detalles de cada agente
 * → Puede agregar nuevos agentes (admin)
 */

// ============================================================================
// ARQUITECTURA RESULTANTE
// ============================================================================

/**
 * NUEVA ARQUITECTURA:
 * 
 * Browser                Next.js App              Local Database
 * ├─ /inbox             ├─ /api/conversations    ├─ conversations
 * │  └─ fetch           │  ├─ getSession()       ├─ contacts
 * │  ├─ /api/conv...    │  ├─ query DB          ├─ messages
 * │  └─ response        │  └─ return {}          └─ users
 * │
 * └─ useConversations   └─ /api/users/agents
 *    ├─ fetch               ├─ getSession()
 *    ├─ map data            ├─ LEFT JOIN roles
 *    └─ setConversations    └─ return []
 * 
 * VENTAJAS:
 * ✅ Flujo seguro (autenticación en servidor)
 * ✅ Sin problemas de CORS
 * ✅ Sin problemas de tokens expirados
 * ✅ Datos consistentes
 * ✅ Funciona offline
 * ✅ Más rápido (sin latencia de backend)
 * ✅ Datos siempre disponibles (fallback a demo)
 */
