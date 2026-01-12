# ⚡ Guía Rápida de Uso - Internal Chat MVP

> Instrucciones paso a paso para iniciar y usar el sistema.

## 🎯 Tabla de Contenidos

1. [Setup Inicial](#setup-inicial)
2. [Ejecutar el Proyecto](#ejecutar-el-proyecto)
3. [Crear Usuario](#crear-usuario)
4. [Usar el Dashboard](#usar-el-dashboard)
5. [API Endpoints](#api-endpoints)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Setup Inicial

### Paso 1: Instalar PostgreSQL

**Windows**:
```bash
# Descargar desde https://www.postgresql.org/download/windows/
# Instalar con instalador gráfico
# Recordar usuario: postgres, contraseña: (la que configuraste)
```

**macOS** (con Homebrew):
```bash
brew install postgresql
brew services start postgresql
```

**Linux** (Ubuntu):
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Alternativa (Docker)**:
```bash
docker run --name postgres-chat \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=internal_chat_mvp \
  -p 5432:5432 \
  -d postgres:15-alpine
```

### Paso 2: Crear Base de Datos

```bash
# Conectarse a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE internal_chat_mvp;

# Salir
\q
```

### Paso 3: Ejecutar Scripts SQL

```bash
# Crear tablas
psql -U postgres -d internal_chat_mvp -f scripts/001_initial_schema.sql

# Insertar datos iniciales (opcional)
psql -U postgres -d internal_chat_mvp -f scripts/002_seed_data.sql
```

### Paso 4: Configurar Proyecto

```bash
# Copiar variables de entorno
cp .env.example .env.local

# Editar .env.local con valores reales
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/internal_chat_mvp
# JWT_SECRET=tu-clave-secreta
```

### Paso 5: Instalar Dependencias

```bash
npm install
# o
pnpm install
```

---

## 🚀 Ejecutar el Proyecto

### Modo Desarrollo

```bash
npm run dev
```

Abre: **http://localhost:3000**

### Modo Producción

```bash
npm run build
npm run start
```

---

## 👤 Crear Usuario

### Opción 1: Formulario Web

1. Ir a http://localhost:3000/signup
2. Llenar email, contraseña, nombre
3. Click "Registrarse"
4. Redirige automáticamente a login

### Opción 2: API con cURL

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@company.com",
    "password": "SecurePassword123",
    "name": "Juan García"
  }'
```

**Respuesta exitosa (201)**:
```json
{
  "message": "User created successfully",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": "7d",
  "user": {
    "id": 1,
    "email": "agent@company.com",
    "name": "Juan García",
    "role": "agent",
    "status": "available"
  }
}
```

---

## 📱 Usar el Dashboard

### 1. Login

```
Email: agent@company.com
Contraseña: SecurePassword123
```

### 2. Acceder a Inbox

Luego de login, se abre automáticamente: http://localhost:3000/inbox

### 3. Secciones del Dashboard

#### 📌 Conversaciones
- **URL**: http://localhost:3000/inbox/conversaciones
- **Función**: Ver y responder chats con clientes
- **Acciones**: Asignar agente, cambiar estado, agregar tags

#### 👥 Agentes
- **URL**: http://localhost:3000/inbox/agentes
- **Función**: Ver agentes disponibles
- **Info**: Estado, conversaciones asignadas

#### ⚙️ Configuración
- **URL**: http://localhost:3000/inbox/configuracion
- **Función**: Macros, preferencias, integraciones
- **Acciones**: Crear plantillas, editar macros

---

## 📡 API Endpoints

### Autenticación

#### Registrarse
```bash
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "Password123",
  "name": "John Doe"
}

Response: 201 Created
{
  "access_token": "token...",
  "token_type": "Bearer",
  "expires_in": "7d",
  "user": { ... }
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "Password123"
}

Response: 200 OK
{
  "access_token": "token...",
  "token_type": "Bearer",
  "expires_in": "7d"
}
```

#### Logout
```bash
POST /api/auth/logout
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Logged out successfully"
}
```

### Contactos

#### Crear Contacto
```bash
POST /api/contacts
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone_number": "+5491123456789",
  "name": "Cliente 1"
}

Response: 201 Created
{
  "id": 1,
  "phone_number": "+5491123456789",
  "name": "Cliente 1",
  "last_seen": null,
  "created_at": "2024-01-10T10:00:00Z"
}
```

#### Listar Contactos
```bash
GET /api/contacts
Authorization: Bearer <token>

Response: 200 OK
[
  { "id": 1, "phone_number": "+5491123456789", "name": "Cliente 1", ... },
  { "id": 2, "phone_number": "+5491198765432", "name": "Cliente 2", ... }
]
```

#### Obtener Contacto
```bash
GET /api/contacts/1
Authorization: Bearer <token>

Response: 200 OK
{
  "id": 1,
  "phone_number": "+5491123456789",
  "name": "Cliente 1",
  "avatar_url": null,
  "last_seen": "2024-01-10T15:30:00Z",
  "created_at": "2024-01-10T10:00:00Z"
}
```

#### Actualizar Contacto
```bash
PATCH /api/contacts/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Cliente 1 - Actualizado",
  "avatar_url": "https://..."
}

Response: 200 OK
{ ... }
```

#### Eliminar Contacto
```bash
DELETE /api/contacts/1
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Contact deleted successfully"
}
```

### Conversaciones

#### Crear Conversación
```bash
POST /api/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "contact_id": 1,
  "assigned_agent_id": 1,
  "status": "open",
  "priority": "normal"
}

Response: 201 Created
{
  "id": 1,
  "contact_id": 1,
  "assigned_agent_id": 1,
  "status": "open",
  "priority": "normal",
  "last_message_at": null,
  "created_at": "2024-01-10T10:00:00Z",
  "updated_at": "2024-01-10T10:00:00Z"
}
```

#### Asignar Agente
```bash
POST /api/conversations/1/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "agent_id": 2
}

Response: 200 OK
{ ... }
```

#### Listar Conversaciones
```bash
GET /api/conversations
Authorization: Bearer <token>

Response: 200 OK
[
  { "id": 1, "contact_id": 1, ... },
  { "id": 2, "contact_id": 2, ... }
]
```

### Mensajes

#### Enviar Mensaje
```bash
POST /api/conversations/1/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hola, ¿cómo estás?",
  "message_type": "text"
}

Response: 201 Created
{
  "id": 1,
  "conversation_id": 1,
  "sender_type": "user",
  "sender_id": 1,
  "content": "Hola, ¿cómo estás?",
  "message_type": "text",
  "read_at": null,
  "created_at": "2024-01-10T10:00:00Z"
}
```

#### Listar Mensajes
```bash
GET /api/conversations/1/messages
Authorization: Bearer <token>

Response: 200 OK
[
  { "id": 1, "content": "Hola, ¿cómo estás?", ... },
  { "id": 2, "content": "Bien, ¿y tú?", ... }
]
```

### Órdenes

#### Crear Orden
```bash
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "order_number": "ORD-001",
  "contact_id": 1,
  "status": "pending",
  "total_amount": 150.00,
  "items": [
    { "name": "Producto 1", "quantity": 2, "price": 75.00 }
  ]
}

Response: 201 Created
{ ... }
```

#### Listar Órdenes
```bash
GET /api/orders
Authorization: Bearer <token>

Response: 200 OK
[ ... ]
```

### Macros

#### Crear Macro
```bash
POST /api/macros
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Saludo",
  "content": "Hola! 👋 ¿En qué puedo ayudarte?",
  "shortcut": "/saludo"
}

Response: 201 Created
{ ... }
```

#### Usar Macro
```bash
POST /api/macros/1/use
Authorization: Bearer <token>

Response: 200 OK
{
  "usage_count": 5,
  "message": "Macro used successfully"
}
```

#### Listar Macros
```bash
GET /api/macros
Authorization: Bearer <token>

Response: 200 OK
[ ... ]
```

---

## 🆘 Troubleshooting

### "Internal server error" en signup

**Problema**: No puede conectarse a la base de datos

**Soluciones**:

1. Verificar PostgreSQL está corriendo
   ```bash
   # Windows
   services.msc → Buscar PostgreSQL → Iniciar
   
   # macOS
   brew services list | grep postgresql
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Verificar DATABASE_URL en `.env.local`
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/internal_chat_mvp
   ```

3. Verificar tabla existe
   ```bash
   psql -U postgres -d internal_chat_mvp -c "\dt users"
   ```

4. Si no existe, ejecutar script:
   ```bash
   psql -U postgres -d internal_chat_mvp -f scripts/001_initial_schema.sql
   ```

### "Email already registered"

**Problema**: El email ya tiene una cuenta

**Solución**: Usa otro email o elimina el usuario:
```bash
psql -U postgres -d internal_chat_mvp
DELETE FROM users WHERE email = 'old@email.com';
\q
```

### "Invalid token"

**Problema**: Token JWT expiró o es inválido

**Solución**:
1. Login nuevamente para obtener token nuevo
2. Copiar token desde respuesta
3. Usar en header: `Authorization: Bearer <token>`

### "Port 3000 already in use"

**Problema**: Otro proceso está usando puerto 3000

**Solución**:
```bash
# Ver qué proceso usa puerto 3000
# Windows
netstat -ano | findstr :3000

# macOS/Linux
lsof -i :3000

# Matar proceso
# Windows
taskkill /PID <PID> /F

# macOS/Linux
kill -9 <PID>

# O usar puerto diferente
npm run dev -- -p 3001
```

### "Cannot find module..."

**Problema**: Dependencias no están instaladas

**Solución**:
```bash
npm install
# Luego
npm run dev
```

---

## 📚 Recursos Adicionales

- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Guía de configuración detallada
- [Next.js Docs](https://nextjs.org/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs)
- [JWT.io](https://jwt.io)
- [Twilio Docs](https://www.twilio.com/docs)

---

## 💡 Tips & Tricks

### Obtener Token para Testing

```bash
# 1. Registrarse
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "name": "Test User"
  }'

# 2. Copiar access_token de la respuesta
# 3. Usarlo en próximas requests

curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/contacts
```

### Reset Completo de Base de Datos

```bash
# Eliminar base de datos
dropdb internal_chat_mvp

# Crear nueva
createdb internal_chat_mvp

# Crear tablas
psql -U postgres -d internal_chat_mvp -f scripts/001_initial_schema.sql

# Cargar datos
psql -U postgres -d internal_chat_mvp -f scripts/002_seed_data.sql
```

### Probar con Postman/Insomnia

1. Descargar [Postman](https://www.postman.com/downloads/) o [Insomnia](https://insomnia.rest/download)
2. Crear nueva collection
3. Agregar requests:
   - POST /api/auth/signup
   - POST /api/auth/login
   - GET /api/contacts (con token)
   - Etc.

---

**¡Listo para empezar!** 🎉

Si tienes problemas, revisa [SETUP_GUIDE.md](SETUP_GUIDE.md) para más detalles.
