# 🚀 Internal Chat MVP - Guía Completa de Implementación

## 📚 Índice General

1. [Visión General](#visión-general)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Configuración Inicial](#configuración-inicial)
5. [Desarrollo Local](#desarrollo-local)
6. [Despliegue en Producción](#despliegue-en-producción)
7. [Integración WhatsApp](#integración-whatsapp)
8. [Documentación Adicional](#documentación-adicional)

---

## Visión General

**Internal Chat MVP** es una aplicación completa para gestionar conversaciones con clientes a través de WhatsApp. Utiliza Twilio como proveedor de mensajería WhatsApp. Permite que agentes internos de una empresa:

- ✅ Ver todas las conversaciones activas
- ✅ Responder mensajes de WhatsApp
- ✅ Asignar conversaciones a agentes
- ✅ Usar macros/respuestas rápidas
- ✅ Ver órdenes y datos del cliente
- ✅ Etiquetar conversaciones
- ✅ Cambiar estado de conversaciones

**Componentes:**
- **Frontend**: Next.js 15 + React + TypeScript + Tailwind CSS
- **Backend**: NestJS + TypeORM + PostgreSQL
- **Base de Datos**: PostgreSQL (en Railway)
- **Integración**: Twilio WhatsApp API
- **Despliegue**: Railway (backend) + Vercel (frontend)

---

## Estructura del Proyecto

```
internal-chat-mvp/
├── app/                              # Frontend Next.js
│   ├── api/                          # ⚠️ A eliminar (mover a backend)
│   ├── inbox/                        # Dashboard principal
│   ├── login/                        # Página de login
│   ├── signup/                       # Página de registro
│   └── layout.tsx                    # Layout principal
│
├── backend/                          # ✨ NUEVO - Backend NestJS
│   ├── src/
│   │   ├── main.ts                  # Punto de entrada
│   │   ├── app.module.ts            # Módulo principal
│   │   ├── config/                  # Configuración
│   │   └── modules/
│   │       ├── auth/                # Autenticación JWT
│   │       ├── users/               # Gestión de usuarios
│   │       ├── contacts/            # Gestión de contactos
│   │       ├── conversations/       # Conversaciones
│   │       ├── messages/            # Mensajes
│   │       ├── orders/              # Órdenes
│   │       ├── macros/              # Macros
│   │       └── whatsapp/            # 🔥 Integración WhatsApp
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
│
├── components/                       # Componentes React
│   ├── chat-area.tsx                # Área de chat
│   ├── conversation-list.tsx        # Lista de conversaciones
│   ├── inbox-sidebar.tsx            # Sidebar del inbox
│   └── ... (otros componentes)
│
├── lib/
│   ├── api-client.ts                # 🔄 NUEVO - Cliente API
│   └── ... (utilidades)
│
├── docker-compose.yml               # 🆕 Docker Compose para BD local
├── DEPLOYMENT_GUIDE.md              # 📖 Guía de despliegue
├── FRONTEND_INTEGRATION.md          # 📖 Integración frontend-backend
├── DOCKER_SETUP.md                  # 📖 Setup de Docker
└── ... (otros archivos)
```

---

## Stack Tecnológico

### Frontend
| Tecnología | Propósito |
|-----------|----------|
| **Next.js 15** | Framework React con SSR |
| **TypeScript** | Tipado estático |
| **Tailwind CSS** | Estilos |
| **Shadcn/UI** | Componentes UI |
| **React Hooks** | State management |

### Backend
| Tecnología | Propósito |
|-----------|----------|
| **NestJS** | Framework Node.js modular |
| **TypeORM** | ORM para BD |
| **PostgreSQL** | Base de datos relacional |
| **JWT** | Autenticación |
| **Passport.js** | Estrategias de auth |
| **Axios** | HTTP client |
| **Swagger** | Documentación API |

### Infraestructura
| Servicio | Propósito |
|---------|----------|
| **Railway** | Hosting backend + PostgreSQL |
| **Vercel** | Hosting frontend (opcional) |
| **WhatsApp Cloud API** | Webhooks + envío de mensajes |

---

## Configuración Inicial

### Requisitos Previos

- Node.js 18+ (con npm o pnpm)
- Git
- Docker (opcional, para BD local)
- Cuenta en Railway.app
- Cuenta de desarrollador en Meta (para WhatsApp)

### 1. Clonar Repositorio

```bash
git clone <tu-repo>
cd internal-chat-mvp
```

### 2. Instalar Dependencias

```bash
# Frontend (Next.js)
pnpm install

# Backend (NestJS)
cd backend
pnpm install
```

### 3. Configurar Variables de Entorno

#### Frontend (`app/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

#### Backend (`backend/.env.local`)
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://chatuser:chatpassword@localhost:5432/internal_chat
JWT_SECRET=dev-secret-key
WHATSAPP_BUSINESS_ACCOUNT_ID=your_id
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_API_KEY=your_api_key
WHATSAPP_WEBHOOK_TOKEN=your_token
CORS_ORIGIN=http://localhost:3000
```

---

## Desarrollo Local

### Opción 1: Sin Base de Datos Local (Demo Mode)

```bash
# Frontend - Terminal 1
cd app
pnpm dev
# → http://localhost:3000

# Backend - Terminal 2
cd backend
pnpm start:dev
# → http://localhost:3001
# → Docs: http://localhost:3001/docs
```

### Opción 2: Con PostgreSQL Local (Recomendado)

```bash
# 1. Iniciar PostgreSQL con Docker
docker-compose up -d

# 2. Verificar conexión
docker-compose ps  # Ver que postgres esté running

# 3. Frontend - Terminal 1
cd app
pnpm dev

# 4. Backend - Terminal 2
cd backend
pnpm start:dev
```

Acceso a BD:
- **pgAdmin**: http://localhost:5050
- **Email**: admin@example.com
- **Password**: admin

### Desarrollo Frontend

Componentes principales a actualizar:

```typescript
// lib/api-client.ts (crear nuevo)
// Cambiar fetch('/api/...') a apiClient.get('/...')

// components/chat-area.tsx
// components/conversation-list.tsx
// components/assign-agent-dialog.tsx
// app/login/page.tsx
```

Ver: [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)

### Testing de API

```bash
# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Obtener conversaciones
curl -X GET http://localhost:3001/api/v1/conversations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Despliegue en Producción

### Fase 1: Preparar Railway

1. Crear cuenta en https://railway.app
2. Crear nuevo proyecto
3. Agregar PostgreSQL
4. Agregar servicio para NestJS backend
5. Configurar variables de entorno

Ver: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) (Sección "Setup en Railway")

### Fase 2: Conectar WhatsApp

1. Obtener credenciales de Meta/Facebook
2. Crear webhook
3. Suscribirse a eventos
4. Configurar en Railway

Ver: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) (Sección "Configuración de WhatsApp Business")

### Fase 3: Desplegar Frontend

```bash
# Opción 1: Vercel (recomendado)
vercel deploy

# Opción 2: Railway
# Agregar nuevo servicio y conectar repo

# Opción 3: Tu propio hosting
npm run build
npm run start:prod
```

### Checklist de Despliegue

- [ ] PostgreSQL en Railway funcionando
- [ ] Backend NestJS deployado en Railway
- [ ] Variables de entorno configuradas
- [ ] Webhook de WhatsApp verificado
- [ ] Frontend apuntando a backend en Railway
- [ ] Testing en producción
- [ ] CORS configurado correctamente
- [ ] Dominios y SSL configurados

---

## Integración WhatsApp

### Arquitectura del Flujo

```
Cliente WhatsApp → WhatsApp Cloud API → Webhook Backend
                                          ↓
                                    Procesar Mensaje
                                          ↓
                                    Guardar en BD
                                          ↓
                                    Notificar Frontend
                                          ↓
                                    Agente responde
                                          ↓
                                    Backend envía a WhatsApp
```

### Implementación

**Módulo WhatsApp** (`backend/src/modules/whatsapp/`):

- `whatsapp.service.ts`: Lógica de negocio
  - `handleWebhook()`: Procesa mensajes entrantes
  - `sendMessage()`: Envía mensaje por WhatsApp
  - `sendTemplateMessage()`: Envía template
  - `markAsRead()`: Marca como leído

- `whatsapp.controller.ts`: Endpoints
  - `GET /webhook`: Verificación
  - `POST /webhook`: Recibir mensajes
  - `POST /send`: Enviar mensaje
  - `POST /send-template`: Enviar template
  - `POST /mark-read`: Marcar leído

### Flujo de un Mensaje Entrante

1. Cliente envía mensaje por WhatsApp
2. WhatsApp Cloud API hace POST a `/api/v1/whatsapp/webhook`
3. Backend procesa:
   - Obtiene número del cliente
   - Busca o crea contacto
   - Obtiene o crea conversación
   - Guarda mensaje en BD
   - Actualiza fecha de último mensaje
   - Actualiza "last_seen" del contacto
4. Frontend recibe actualización (REST polling o WebSocket)
5. Agente ve mensaje en la UI

### Prueba Local del Webhook

```bash
# Verificación (prueba de token)
curl -X GET "http://localhost:3001/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=your_token"

# Debería retornar: 123

# Simular mensaje entrante
curl -X POST http://localhost:3001/api/v1/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "1234567890",
            "id": "wamid.xxx",
            "type": "text",
            "timestamp": "1234567890",
            "text": { "body": "Hola!" }
          }],
          "contacts": [{
            "profile": { "name": "Juan" }
          }]
        }
      }]
    }]
  }'
```

---

## Documentación Adicional

### 📖 Archivos de Documentación

| Archivo | Descripción |
|---------|-----------|
| [backend/README.md](./backend/README.md) | Guía completa del backend |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Paso a paso para producción |
| [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) | Conectar frontend a backend |
| [DOCKER_SETUP.md](./DOCKER_SETUP.md) | Setup de Docker para desarrollo |
| [backend/EXAMPLE_API_CLIENT.ts](./backend/EXAMPLE_API_CLIENT.ts) | Ejemplo de API client |

### 🔗 Enlaces Útiles

- **NestJS Docs**: https://docs.nestjs.com
- **TypeORM Docs**: https://typeorm.io
- **WhatsApp Cloud API**: https://developers.facebook.com/docs/whatsapp/cloud-api
- **Railway Docs**: https://docs.railway.app
- **Next.js Docs**: https://nextjs.org/docs

---

## 🎯 Próximos Pasos

### Fase 1: Setup Inmediato
- [ ] Crear backend/lib/api-client.ts
- [ ] Actualizar componentes del frontend
- [ ] Testing en desarrollo local
- [ ] Remover rutas de API Next.js

### Fase 2: Despliegue
- [ ] Crear cuenta Railway
- [ ] Desplegar PostgreSQL
- [ ] Desplegar backend
- [ ] Configurar WhatsApp webhook
- [ ] Desplegar frontend

### Fase 3: Optimizaciones
- [ ] Agregar WebSockets para mensajes en tiempo real
- [ ] Implementar Redis para caché
- [ ] Agregar rate limiting
- [ ] Implementar tests
- [ ] Logging y monitoreo
- [ ] Backup automático de BD

### Fase 4: Features Adicionales
- [ ] Soporte multi-idioma
- [ ] Análisis y reportes
- [ ] Automatización de workflows
- [ ] Integración con CRM
- [ ] Mobile app

---

## 📞 Support

Si tienes dudas o problemas:

1. Revisa la documentación en [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
2. Verifica logs: `railway logs -f`
3. Lee [backend/README.md](./backend/README.md)
4. Consulta los enlaces útiles arriba

---

## 📄 Licencia

MIT

---

**Desarrollado con ❤️ para Internal Chat MVP**

*Última actualización: Enero 2026*
