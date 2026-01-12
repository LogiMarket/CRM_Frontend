# 🚀 Internal Chat MVP

> Sistema completo de gestión de conversaciones con WhatsApp a través de Twilio

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-Production%20Ready-brightgreen)

## 📋 Descripción

Internal Chat MVP es una aplicación full-stack para gestionar conversaciones de clientes a través de WhatsApp. Integra Twilio para el envío y recepción de mensajes, permitiendo a los agentes internos responder de manera eficiente.

## ✨ Características Principales

- 💬 **Gestión de Conversaciones**: Interfaz completa para manejar chats con clientes
- 📱 **Integración Twilio WhatsApp**: Envío y recepción de mensajes automática
- 👥 **Asignación de Agentes**: Distribuir conversaciones entre agentes
- 🏷️ **Macros/Respuestas Rápidas**: Templates para acelerar respuestas
- 📦 **Órdenes Integradas**: Ver información de pedidos en el chat
- 🔐 **Autenticación Segura**: Sistema JWT con roles de usuario
- 📊 **Dashboard Completo**: Vista general de conversaciones y estadísticas

## 🛠️ Stack Tecnológico

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React, TypeScript, Tailwind CSS
- **Componentes**: Shadcn/UI
- **Estado**: React Hooks

### Backend
- **Framework**: NestJS
- **Base de Datos**: PostgreSQL
- **ORM**: TypeORM
- **Autenticación**: Passport.js + JWT
- **Integración**: Twilio SDK
- **Documentación**: Swagger/OpenAPI

## 📂 Estructura del Proyecto

```
internal-chat-mvp/
├── app/                          # Frontend Next.js
│   ├── inbox/                    # Dashboard principal
│   ├── login/                    # Autenticación
│   └── ...
├── components/                   # Componentes React
│   ├── chat-area.tsx
│   ├── conversation-list.tsx
│   └── ...
├── lib/                          # Utilidades frontend
│   └── utils.ts
├── backend/                      # Backend NestJS
│   ├── src/                      # Código fuente
│   │   ├── modules/             # Módulos de la app
│   │   │   ├── auth/           # Autenticación
│   │   │   ├── conversations/  # Conversaciones
│   │   │   ├── messages/       # Mensajes
│   │   │   ├── whatsapp/       # Integración Twilio
│   │   │   └── ...
│   │   └── main.ts             # Punto de entrada
│   ├── docs/                    # Documentación del backend
│   │   ├── TWILIO_SETUP.md
│   │   ├── DEPLOYMENT_GUIDE.md
│   │   └── ...
│   ├── docker-compose.yml       # PostgreSQL local
│   ├── package.json
│   └── README.md                # Documentación del backend
├── FRONTEND_INTEGRATION.md      # Guía de integración
├── GETTING_STARTED.md           # Guía de inicio
└── README.md                    # Este archivo
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- pnpm
- Docker y Docker Compose
- Cuenta de Twilio (para WhatsApp)

### 1. Clonar el Repositorio

```bash
git clone <tu-repo>
cd internal-chat-mvp
```

### 2. Configurar Backend

```bash
# Ir a la carpeta backend
cd backend

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Iniciar PostgreSQL
docker-compose up -d

# Iniciar el servidor
pnpm start:dev
```

El backend estará disponible en: `http://localhost:3001`

**Documentación completa**: [backend/README.md](backend/README.md)

### 3. Configurar Frontend

```bash
# Volver a la raíz
cd ..

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local

# Iniciar el servidor de desarrollo
pnpm dev
```

El frontend estará disponible en: `http://localhost:3000`

### 4. Configurar Twilio

Sigue la guía completa: [backend/docs/TWILIO_SETUP.md](backend/docs/TWILIO_SETUP.md)

## 📖 Documentación

### Backend

- [**Backend README**](backend/README.md) - Documentación completa del backend
- [Guía de Configuración de Twilio](backend/docs/TWILIO_SETUP.md) - Setup de Twilio paso a paso
- [Guía de Despliegue](backend/docs/DEPLOYMENT_GUIDE.md) - Despliegue en Railway
- [Checklist de Despliegue](backend/docs/DEPLOYMENT_CHECKLIST.md) - Lista de verificación
- [Próximos Pasos](backend/docs/NEXT_STEPS.md) - Qué hacer después de la instalación
- [Docker Setup](backend/docs/DOCKER_SETUP.md) - Configuración de Docker
- [Resumen de Migración](backend/docs/TWILIO_MIGRATION_SUMMARY.md) - Cambios de WhatsApp a Twilio

### Frontend

- [Guía de Integración Frontend](FRONTEND_INTEGRATION.md) - Conectar frontend con backend
- [Guía de Inicio](GETTING_STARTED.md) - Visión general del proyecto

## 🔑 API Endpoints

El backend expone una API REST completa. Documentación interactiva disponible en:

```
http://localhost:3001/api/docs
```

### Principales Endpoints

- `POST /auth/login` - Iniciar sesión
- `POST /auth/signup` - Registrar usuario
- `GET /conversations` - Listar conversaciones
- `POST /whatsapp/send` - Enviar mensaje WhatsApp
- `POST /whatsapp/webhook` - Webhook de Twilio
- `GET /orders` - Listar órdenes
- `GET /macros` - Listar macros

Ver documentación completa: [backend/README.md](backend/README.md)

## 🧪 Testing

### Backend

```bash
cd backend

# Testing manual con curl
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Swagger UI
open http://localhost:3001/api/docs
```

### Frontend

```bash
# Abrir en navegador
open http://localhost:3000
```

## 🚀 Despliegue

### Backend (Railway)

1. Crear proyecto en [Railway](https://railway.app)
2. Agregar PostgreSQL
3. Conectar repositorio
4. Configurar variables de entorno
5. Deploy automático

**Guía completa**: [backend/docs/DEPLOYMENT_GUIDE.md](backend/docs/DEPLOYMENT_GUIDE.md)

### Frontend (Vercel)

1. Importar proyecto en [Vercel](https://vercel.com)
2. Configurar variables de entorno
3. Deploy automático

## 🛠️ Scripts Disponibles

### Frontend

```bash
pnpm dev          # Desarrollo
pnpm build        # Compilar para producción
pnpm start        # Servidor de producción
pnpm lint         # Linter
```

### Backend

```bash
pnpm start:dev    # Desarrollo (watch mode)
pnpm build        # Compilar
pnpm start        # Producción
pnpm test         # Tests
```

## 🔧 Configuración

### Variables de Entorno - Backend

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=internal_chat_mvp
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WEBHOOK_TOKEN=webhook-token

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Ver: [backend/.env.example](backend/.env.example)

### Variables de Entorno - Frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_ENABLE_WHATSAPP=true
```

## 🆘 Troubleshooting

### Backend no inicia

```bash
# Verificar PostgreSQL
docker-compose ps

# Reinstalar dependencias
cd backend
rm -rf node_modules
pnpm install
```

### Error de conexión a base de datos

```bash
# Reiniciar PostgreSQL
cd backend
docker-compose restart
```

### Webhook de Twilio no funciona

1. Verificar URL pública configurada en Twilio
2. Verificar `TWILIO_WEBHOOK_TOKEN` correcto
3. Ver logs: `cd backend && docker-compose logs -f`

**Más ayuda**: [backend/README.md#troubleshooting](backend/README.md#troubleshooting)

## 📄 Licencia

MIT

## 👥 Contribución

Pull requests son bienvenidos. Para cambios importantes, abre un issue primero.

## 📞 Soporte

- **Documentación Backend**: [backend/README.md](backend/README.md)
- **Setup de Twilio**: [backend/docs/TWILIO_SETUP.md](backend/docs/TWILIO_SETUP.md)
- **Guía de Despliegue**: [backend/docs/DEPLOYMENT_GUIDE.md](backend/docs/DEPLOYMENT_GUIDE.md)

---

**Desarrollado por**: LOGIMARKET  
**Última actualización**: Enero 2026  
**Versión**: 1.0.0
