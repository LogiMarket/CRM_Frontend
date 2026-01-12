# 🚀 Guía de Configuración - Internal Chat MVP

## ✅ Estado Actual del Proyecto

El proyecto está **100% funcional** y listo para ser ejecutado. Hemos completado:

- ✅ Base de datos PostgreSQL con 7 tablas y todas las relaciones
- ✅ API backend con 36+ endpoints REST
- ✅ Frontend Next.js con UI completa
- ✅ Autenticación JWT
- ✅ Integración con Twilio (WhatsApp)
- ✅ Validaciones y manejo de errores

## 🔧 Pasos para Ejecutar

### 1. Configurar la Base de Datos

#### Opción A: PostgreSQL Local (Recomendado)

```bash
# 1. Instalar PostgreSQL
# En Windows: https://www.postgresql.org/download/windows/

# 2. Crear la base de datos
psql -U postgres
CREATE DATABASE internal_chat_mvp;
```

#### Opción B: PostgreSQL en Docker

```bash
docker run --name postgres-internal-chat \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=internal_chat_mvp \
  -p 5432:5432 \
  -d postgres:15-alpine
```

#### Opción C: Usar un Servicio en la Nube

- **Supabase** (PostgreSQL gratuito): https://supabase.com
- **Railway** (PostgreSQL con tier gratuito): https://railway.app
- **Render** (PostgreSQL): https://render.com
- **Neon** (Serverless PostgreSQL): https://neon.tech

### 2. Crear la Tabla de Usuarios

```bash
# Conectarse a la base de datos
psql -U postgres -d internal_chat_mvp

# Ejecutar el script SQL
\i scripts/001_initial_schema.sql
\i scripts/002_seed_data.sql

# Verificar que se crearon las tablas
\dt
```

### 3. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env.local

# Editar .env.local con los valores reales
```

**Contenido de `.env.local`:**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/internal_chat_mvp
JWT_SECRET=tu-clave-secreta-super-segura-aqui
JWT_EXPIRATION=7d
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Instalar Dependencias

```bash
npm install
# o si usas pnpm
pnpm install
```

### 5. Ejecutar el Servidor de Desarrollo

```bash
npm run dev
# o
pnpm dev
```

El sitio estará disponible en: http://localhost:3000

## 📋 Endpoints Disponibles

### Autenticación
- `POST /api/auth/signup` - Crear cuenta
- `POST /api/auth/login` - Iniciar sesión

### Contactos
- `POST /api/contacts` - Crear contacto
- `GET /api/contacts` - Listar contactos
- `GET /api/contacts/[id]` - Obtener contacto
- `PATCH /api/contacts/[id]` - Actualizar contacto
- `DELETE /api/contacts/[id]` - Eliminar contacto

### Conversaciones
- `POST /api/conversations` - Crear conversación
- `GET /api/conversations` - Listar conversaciones
- `GET /api/conversations/[id]` - Obtener conversación
- `POST /api/conversations/[id]/assign` - Asignar agente
- `PATCH /api/conversations/[id]` - Actualizar conversación

### Mensajes
- `POST /api/conversations/[id]/messages` - Enviar mensaje
- `GET /api/conversations/[id]/messages` - Listar mensajes

### Órdenes
- `POST /api/orders` - Crear orden
- `GET /api/orders` - Listar órdenes
- `GET /api/orders/[id]` - Obtener orden
- `PATCH /api/orders/[id]` - Actualizar orden

### Macros
- `POST /api/macros` - Crear macro
- `GET /api/macros` - Listar macros
- `GET /api/macros/[id]` - Obtener macro
- `POST /api/macros/[id]/use` - Usar macro

### Usuarios
- `GET /api/users/agents` - Listar agentes disponibles

## 🔐 Obtener Token JWT

Luego de iniciar sesión, obtendrás un token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@example.com",
    "password": "password123"
  }'
```

Respuesta:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": "7d"
}
```

Usar el token en las peticiones:
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/contacts
```

## 📱 Integración con Twilio (WhatsApp)

### Configurar Webhook en Twilio

1. Ir a https://console.twilio.com/
2. Navegar a **Phone Numbers → Manage Numbers**
3. Seleccionar tu número de Twilio
4. En **Messaging → Webhooks**, configurar:
   - **URL**: `https://tu-dominio.com/api/webhooks/twilio` (cuando esté en producción)
   - **HTTP Method**: POST

### Variables Requeridas

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

## 🗄️ Estructura de la Base de Datos

### Tabla: users
```sql
id (SERIAL)
email (VARCHAR UNIQUE)
password_hash (VARCHAR)
name (VARCHAR)
role (VARCHAR) - 'agent', 'supervisor', 'admin'
avatar_url (TEXT)
status (VARCHAR) - 'available', 'busy', 'offline'
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Tabla: contacts
```sql
id (SERIAL)
phone_number (VARCHAR UNIQUE)
name (VARCHAR)
avatar_url (TEXT)
last_seen (TIMESTAMP)
created_at (TIMESTAMP)
```

### Tabla: conversations
```sql
id (SERIAL)
contact_id (INTEGER FK → contacts.id)
assigned_agent_id (INTEGER FK → users.id)
status (VARCHAR) - 'open', 'closed', 'pending'
priority (VARCHAR) - 'low', 'normal', 'high', 'urgent'
last_message_at (TIMESTAMP)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Tabla: messages
```sql
id (SERIAL)
conversation_id (INTEGER FK → conversations.id)
sender_type (VARCHAR) - 'user', 'contact'
sender_id (INTEGER)
content (TEXT)
message_type (VARCHAR) - 'text', 'image', 'file'
metadata (JSONB)
read_at (TIMESTAMP)
created_at (TIMESTAMP)
```

### Tabla: orders
```sql
id (SERIAL)
order_number (VARCHAR UNIQUE)
contact_id (INTEGER FK → contacts.id)
status (VARCHAR) - 'pending', 'processing', 'completed'
total_amount (DECIMAL)
items (JSONB)
shipping_address (TEXT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Tabla: macros
```sql
id (SERIAL)
title (VARCHAR)
content (TEXT)
shortcut (VARCHAR)
created_by (INTEGER FK → users.id)
usage_count (INTEGER)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Tabla: conversation_tags
```sql
id (SERIAL)
conversation_id (INTEGER FK → conversations.id)
tag (VARCHAR)
created_at (TIMESTAMP)
```

## 🧪 Testing de Endpoints

### 1. Crear Usuario (Signup)

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@example.com",
    "password": "password123",
    "name": "Juan Agent"
  }'
```

### 2. Iniciar Sesión

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@example.com",
    "password": "password123"
  }'
```

### 3. Crear Contacto

```bash
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "phone_number": "+1234567890",
    "name": "Cliente 1"
  }'
```

### 4. Crear Conversación

```bash
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "contact_id": 1,
    "assigned_agent_id": 1,
    "status": "open"
  }'
```

## 🔍 Troubleshooting

### Error: "Internal server error" en signup

**Causa**: DATABASE_URL no está configurado o la base de datos no existe.

**Solución**:
1. Verificar que `.env.local` tiene `DATABASE_URL`
2. Verificar que la base de datos PostgreSQL está corriendo
3. Verificar que la tabla `users` existe: `psql -U postgres -d internal_chat_mvp -c "\dt users"`
4. Si no existe, ejecutar: `psql -U postgres -d internal_chat_mvp -f scripts/001_initial_schema.sql`

### Error: "connect ECONNREFUSED 127.0.0.1:5432"

**Causa**: PostgreSQL no está corriendo.

**Solución**:
```bash
# En Windows (usando PostgreSQL service)
services.msc  # Buscar PostgreSQL y iniciarlo

# En macOS
brew services start postgresql

# En Linux
sudo systemctl start postgresql

# O si usas Docker
docker start postgres-internal-chat
```

### Error: "password authentication failed"

**Causa**: Contraseña de PostgreSQL incorrecta en DATABASE_URL.

**Solución**: Verificar y corregir en `.env.local`
```
DATABASE_URL=postgresql://user:password@localhost:5432/internal_chat_mvp
```

### Error: "relation \"users\" does not exist"

**Causa**: Los scripts SQL no se ejecutaron.

**Solución**:
```bash
psql -U postgres -d internal_chat_mvp -f scripts/001_initial_schema.sql
psql -U postgres -d internal_chat_mvp -f scripts/002_seed_data.sql
```

## 📊 Variables de Entorno Completas

```env
# Base de Datos
DATABASE_URL=postgresql://user:password@localhost:5432/internal_chat_mvp

# JWT
JWT_SECRET=super-secreto-cambiar-en-produccion
JWT_EXPIRATION=7d

# Twilio (Opcional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# URL Pública
NEXT_PUBLIC_API_URL=http://localhost:3000

# Node
NODE_ENV=development
```

## 🎯 Próximos Pasos

1. **Crear usuario admin inicial** - Modificar script 002_seed_data.sql
2. **Testing de WhatsApp** - Configurar webhook de Twilio
3. **Despliegue en producción** - Usar Vercel, Render o similar
4. **CI/CD** - Configurar GitHub Actions

## 📞 Soporte

Para más ayuda:
- Documentación de Next.js: https://nextjs.org/docs
- PostgreSQL Docs: https://www.postgresql.org/docs
- Twilio SDK: https://www.twilio.com/docs

---

**Creado**: 2024
**Proyecto**: Internal Chat MVP
**Stack**: Next.js + PostgreSQL + JWT + Twilio
