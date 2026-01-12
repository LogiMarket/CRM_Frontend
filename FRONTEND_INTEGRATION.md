# Implementación del API Client en Frontend

## Ubicación

Crear el archivo en: `lib/api-client.ts`

## Configuración de variables de entorno

### Desarrollo (`app/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_ENABLE_WHATSAPP=true
```

### Producción (`app/.env.production`)
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_ENABLE_WHATSAPP=true
```

## API Client Implementation

```typescript
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiClient {
  private static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private static getHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}`;
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Unknown error');
    }
  }

  static get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  static post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  static put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  static delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
```

## Actualizar componentes

### 1. Componente de Login

**Archivo**: `app/login/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ApiClient } from '@/lib/api-client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await ApiClient.post('/auth/login', {
        email,
        password,
      }) as any

      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('user_id', response.id)
      localStorage.setItem('user_name', response.name)

      router.push('/inbox')
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin}>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Iniciando...' : 'Iniciar sesión'}
      </button>
    </form>
  )
}
```

### 2. Obtener conversaciones

**Archivo**: `components/conversation-list.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { ApiClient } from '@/lib/api-client'

interface Conversation {
  id: number
  contact: {
    id: number
    name: string
    phone_number: string
  }
  status: string
  priority: string
  assigned_agent_id?: number
  last_message: string
}

export function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await ApiClient.get<Conversation[]>('/conversations')
        setConversations(data)
      } catch (error) {
        console.error('Failed to load conversations', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
  }, [])

  if (loading) return <div>Cargando conversaciones...</div>

  return (
    <div className="space-y-2">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
        >
          <p className="font-semibold">{conv.contact.name}</p>
          <p className="text-sm text-gray-500">{conv.contact.phone_number}</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {conv.priority}
            </span>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              {conv.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
```

### 3. Enviar mensaje WhatsApp

```typescript
'use client'

import { useState } from 'react'
import { ApiClient } from '@/lib/api-client'
import { toast } from 'sonner'

interface SendMessageProps {
  conversationId: number
  phoneNumber: string
}

export function WhatsAppSender({ conversationId, phoneNumber }: SendMessageProps) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) return

    setLoading(true)
    try {
      await ApiClient.post('/whatsapp/send', {
        phoneNumber,
        message,
      })

      toast.success('Mensaje enviado')
      setMessage('')
    } catch (error) {
      toast.error('Error al enviar mensaje')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Escribe tu mensaje..."
        className="w-full p-2 border rounded-lg"
      />
      <button
        onClick={handleSend}
        disabled={loading || !message.trim()}
        className="w-full bg-green-500 text-white p-2 rounded-lg disabled:opacity-50"
      >
        {loading ? 'Enviando...' : 'Enviar por WhatsApp'}
      </button>
    </div>
  )
}
```

interface ConversationListProps {
  selectedId?: number
  onSelectConversation: (id: number) => void
}

export function ConversationList({
  selectedId,
  onSelectConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const data = await apiClient.get('/conversations')
      setConversations(data)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {loading ? (
        <p>Cargando conversaciones...</p>
      ) : (
        <ul>
          {conversations.map((conv) => (
            <li
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={selectedId === conv.id ? 'selected' : ''}
            >
              <div className="contact-name">{conv.contact?.name}</div>
              <div className="contact-phone">{conv.contact?.phone_number}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

### 3. Enviar mensajes

**Archivo**: `components/chat-area.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'

interface ChatAreaProps {
  conversationId?: number
}

export function ChatArea({ conversationId }: ChatAreaProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (conversationId) {
      loadMessages()
    }
  }, [conversationId])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const data = await apiClient.get(`/messages/conversation/${conversationId}`)
      setMessages(data)
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !conversationId) return

    try {
      const userId = localStorage.getItem('user_id')
      const message = await apiClient.post('/messages', {
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: parseInt(userId!),
        content: newMessage,
      })

      setMessages([...messages, message])
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  return (
    <div>
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.sender_type}>
            <p>{msg.content}</p>
            <small>{new Date(msg.created_at).toLocaleTimeString()}</small>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribir mensaje..."
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          Enviar
        </button>
      </form>
    </div>
  )
}
```

### 4. Asignar agente

```typescript
const assignAgent = async (conversationId: number, agentId: number) => {
  try {
    await apiClient.put(`/conversations/${conversationId}/assign`, {
      agent_id: agentId,
    })
    // Refrescar conversación
  } catch (error) {
    console.error('Error assigning agent:', error)
  }
}
```

### 5. Enviar por WhatsApp

```typescript
const sendWhatsappMessage = async (phoneNumber: string, message: string) => {
  try {
    const response = await apiClient.post('/whatsapp/send', {
      phone_number: phoneNumber,
      message,
    })
    console.log('WhatsApp message sent:', response.whatsapp_message_id)
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
  }
}
```

## Testing

Verificar en la consola del navegador:

```javascript
// En DevTools console
await fetch('http://localhost:3001/api/v1/conversations', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  }
}).then(r => r.json())
```

---

## Checklist

- [ ] Crear `lib/api-client.ts`
- [ ] Configurar `NEXT_PUBLIC_API_URL`
- [ ] Actualizar LoginPage
- [ ] Actualizar ConversationList
- [ ] Actualizar ChatArea
- [ ] Actualizar AssignAgentDialog
- [ ] Actualizar OrdersPanel
- [ ] Actualizar MacrosDialog
- [ ] Remover API routes de Next.js (`app/api/*`)
- [ ] Testing en desarrollo

