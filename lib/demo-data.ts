// Demo users - password is "demo123" for all
const DEMO_PASSWORD = "demo123"

export const DEMO_USERS = [
  {
    id: 1,
    email: "admin@demo.com",
    password: DEMO_PASSWORD,
    name: "Carlos Admin",
    role: "admin",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos",
    status: "online",
  },
  {
    id: 2,
    email: "agent1@demo.com",
    password: DEMO_PASSWORD,
    name: "María García",
    role: "agent",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
    status: "online",
  },
  {
    id: 3,
    email: "agent2@demo.com",
    password: DEMO_PASSWORD,
    name: "Juan López",
    role: "agent",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Juan",
    status: "away",
  },
]

export const DEMO_CONTACTS = [
  {
    id: 1,
    phone_number: "+52 1 555 123 4567",
    name: "Ana Martínez",
    email: "ana.martinez@email.com",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ana",
  },
  {
    id: 2,
    phone_number: "+52 1 555 987 6543",
    name: "Roberto Pérez",
    email: "roberto.perez@email.com",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Roberto",
  },
  {
    id: 3,
    phone_number: "+52 1 555 456 7890",
    name: "Laura Hernández",
    email: "laura.hernandez@email.com",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Laura",
  },
]

export const DEMO_CONVERSATIONS = [
  {
    id: 1,
    contact_id: 1,
    assigned_to: 2,
    status: "open",
    priority: "high",
    unread_count: 3,
    last_message_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    contact: DEMO_CONTACTS[0],
    assigned_agent: { name: "María García", avatar_url: DEMO_USERS[1].avatar_url },
  },
  {
    id: 2,
    contact_id: 2,
    assigned_to: 3,
    status: "open",
    priority: "medium",
    unread_count: 0,
    last_message_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    contact: DEMO_CONTACTS[1],
    assigned_agent: { name: "Juan López", avatar_url: DEMO_USERS[2].avatar_url },
  },
  {
    id: 3,
    contact_id: 3,
    assigned_to: 2,
    status: "closed",
    priority: "low",
    unread_count: 0,
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    contact: DEMO_CONTACTS[2],
    assigned_agent: { name: "María García", avatar_url: DEMO_USERS[1].avatar_url },
  },
]

export const DEMO_MESSAGES = [
  {
    id: 1,
    conversation_id: 1,
    sender_type: "contact",
    content: "Hola, necesito ayuda con mi pedido #1234",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 2,
    conversation_id: 1,
    sender_type: "agent",
    user_id: 2,
    content: "¡Hola Ana! Con gusto te ayudo. Déjame revisar tu pedido.",
    created_at: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
  },
  {
    id: 3,
    conversation_id: 1,
    sender_type: "contact",
    content: "Gracias, ¿cuándo llega mi pedido?",
    created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
  },
  {
    id: 4,
    conversation_id: 1,
    sender_type: "agent",
    user_id: 2,
    content: "Tu pedido llegará mañana entre 9am y 6pm. Te enviaré el tracking.",
    created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: 5,
    conversation_id: 1,
    sender_type: "contact",
    content: "Perfecto, muchas gracias!",
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 6,
    conversation_id: 2,
    sender_type: "contact",
    content: "Buenos días, quisiera cambiar mi dirección de envío",
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 7,
    conversation_id: 2,
    sender_type: "agent",
    user_id: 3,
    content: "Claro, ¿cuál es la nueva dirección?",
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
]

export const DEMO_ORDERS = [
  {
    id: 1,
    order_number: "ORD-1234",
    contact_id: 1,
    status: "shipped",
    total_amount: 1299.99,
    currency: "MXN",
    items: [{ name: "iPhone 15 Pro", quantity: 1, price: 1299.99 }],
    shipping_address: "Av. Insurgentes 123, CDMX",
    tracking_number: "MEX123456789",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 2,
    order_number: "ORD-5678",
    contact_id: 2,
    status: "processing",
    total_amount: 499.99,
    currency: "MXN",
    items: [{ name: "AirPods Pro", quantity: 1, price: 499.99 }],
    shipping_address: "Calle Reforma 456, Guadalajara",
    tracking_number: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
]

export const DEMO_MACROS = [
  {
    id: 1,
    title: "Saludo inicial",
    content: "¡Hola! Gracias por contactarnos. ¿En qué puedo ayudarte hoy?",
    shortcut: "/hola",
    created_by: 2,
    usage_count: 45,
  },
  {
    id: 2,
    title: "Solicitar número de orden",
    content: "Para ayudarte mejor, ¿podrías compartirme tu número de orden?",
    shortcut: "/orden",
    created_by: 2,
    usage_count: 32,
  },
  {
    id: 3,
    title: "Despedida",
    content: "Gracias por contactarnos. ¡Que tengas un excelente día!",
    shortcut: "/adios",
    created_by: 3,
    usage_count: 67,
  },
]

export const DEMO_DATA = {
  users: DEMO_USERS,
  contacts: DEMO_CONTACTS,
  conversations: DEMO_CONVERSATIONS,
  messages: DEMO_MESSAGES,
  orders: DEMO_ORDERS,
  macros: DEMO_MACROS,
}
