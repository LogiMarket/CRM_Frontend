# 📚 Índice de Documentación - Internal Chat MVP

Bienvenido a la documentación completa del Internal Chat MVP. Aquí encontrarás todo lo que necesitas saber para usar, desarrollar y desplegar el proyecto.

---

## 🚀 **COMIENZA AQUÍ**

### Para Iniciar Rápidamente
👉 **[QUICK_START.md](QUICK_START.md)** - Guía paso a paso para empezar en 5 minutos

### Para Entender el Proyecto
👉 **[README.md](README.md)** - Visión general, características y stack tecnológico

### Para Verificar Estado Actual
👉 **[RESUMEN_FINAL.md](RESUMEN_FINAL.md)** - Checklist completo de lo que está hecho

---

## 📋 DOCUMENTACIÓN POR TEMA

### 🔧 **Configuración e Instalación**

| Documento | Propósito | Audiencia |
|-----------|-----------|-----------|
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | Guía detallada de instalación y configuración | DevOps / Desarrolladores |
| [.env.example](.env.example) | Variables de entorno requeridas | Todos |
| [validate-setup.sh](validate-setup.sh) | Script de validación (Linux/Mac) | DevOps |
| [validate-setup.ps1](validate-setup.ps1) | Script de validación (Windows) | DevOps |

### 📡 **API y Endpoints**

| Documento | Endpoints | Método |
|-----------|-----------|--------|
| [QUICK_START.md](QUICK_START.md#-api-endpoints) | Todos los endpoints | REST |
| Autenticación | `/api/auth/*` | POST |
| Contactos | `/api/contacts/*` | CRUD |
| Conversaciones | `/api/conversations/*` | CRUD |
| Mensajes | `/api/conversations/*/messages` | CRUD |
| Órdenes | `/api/orders/*` | CRUD |
| Macros | `/api/macros/*` | CRUD |

Ver: [QUICK_START.md → API Endpoints](QUICK_START.md#-api-endpoints)

### 🧪 **Testing**

| Script | Sistema | Propósito |
|--------|---------|-----------|
| [test-endpoints.sh](test-endpoints.sh) | Linux/Mac | Prueba automática de endpoints |
| [test-endpoints.ps1](test-endpoints.ps1) | Windows | Prueba automática de endpoints |

Instrucciones en: [QUICK_START.md → Testing](QUICK_START.md#-probar-con-postmaninsomnia)

### 🗄️ **Base de Datos**

| Archivo | Propósito |
|---------|-----------|
| [scripts/001_initial_schema.sql](scripts/001_initial_schema.sql) | Crear tablas e índices |
| [scripts/002_seed_data.sql](scripts/002_seed_data.sql) | Cargar datos iniciales |

Ver diagrama de BD en: [SETUP_GUIDE.md → Estructura de la BD](SETUP_GUIDE.md#-estructura-de-la-base-de-datos)

---

## 📖 GUÍAS POR CASO DE USO

### 👤 Soy Usuario Final

1. Lee: [README.md](README.md) - Entiende qué es el proyecto
2. Sigue: [QUICK_START.md](QUICK_START.md) - Instala y corre el proyecto
3. Accede: http://localhost:3000 - Usa la aplicación
4. Help: [QUICK_START.md → Troubleshooting](QUICK_START.md#-troubleshooting)

### 👨‍💻 Soy Desarrollador

1. Lee: [README.md](README.md) - Entiende el stack
2. Sigue: [SETUP_GUIDE.md](SETUP_GUIDE.md) - Configuración completa
3. Revisa: Código en `app/` y `lib/`
4. Testing: [QUICK_START.md → API Endpoints](QUICK_START.md#-api-endpoints)
5. Despliegue: [SETUP_GUIDE.md → Despliegue](SETUP_GUIDE.md#-despliegue)

### 🚀 Voy a Desplegar a Producción

1. Lee: [SETUP_GUIDE.md](SETUP_GUIDE.md) - Requiere DB en nube
2. Elije: Vercel, Railway, Render (opciones en SETUP_GUIDE)
3. Configura: Variables de entorno (en [.env.example](.env.example))
4. Testing: Usa [test-endpoints.ps1](test-endpoints.ps1) o [test-endpoints.sh](test-endpoints.sh)
5. Deploy: Sigue guía de tu plataforma

### 🔍 Tengo Problemas

Consulta: [QUICK_START.md → Troubleshooting](QUICK_START.md#-troubleshooting)

---

## 🗂️ ESTRUCTURA DEL PROYECTO

```
internal-chat-mvp/
├── 📁 app/                       # Frontend + Backend Next.js
│   ├── 📁 api/                   # API Routes (endpoints)
│   │   ├── auth/                 # Autenticación
│   │   ├── conversations/        # Conversaciones
│   │   ├── contacts/             # Contactos
│   │   ├── messages/             # Mensajes
│   │   ├── orders/               # Órdenes
│   │   └── macros/               # Macros
│   ├── 📁 inbox/                 # Dashboard
│   │   ├── page.tsx              # Panel principal
│   │   ├── conversaciones/       # Chat
│   │   ├── agentes/              # Agentes
│   │   └── configuracion/        # Settings
│   ├── 📁 login/                 # Página login
│   ├── 📁 signup/                # Página signup
│   └── layout.tsx                # Layout global
├── 📁 components/                # React components
│   ├── 📁 ui/                    # Shadcn UI
│   ├── chat-area.tsx
│   ├── conversation-list.tsx
│   └── ...
├── 📁 lib/                       # Utilities
│   ├── db.ts                     # PostgreSQL
│   ├── auth.ts                   # Autenticación
│   ├── session.ts                # Sesiones
│   └── utils.ts                  # Helpers
├── 📁 scripts/                   # Scripts SQL
│   ├── 001_initial_schema.sql
│   └── 002_seed_data.sql
├── 📁 public/                    # Assets estáticos
├── 📁 styles/                    # CSS global
│
├── 📄 README.md                  ← Comienza aquí
├── 📄 QUICK_START.md             ← Guía rápida
├── 📄 SETUP_GUIDE.md             ← Configuración
├── 📄 RESUMEN_FINAL.md           ← Estado actual
├── 📄 PROJECT_COMPLETE.md        ← Checklist
├── 📄 DOCUMENTATION_INDEX.md     ← Este archivo
├── 📄 .env.example               ← Variables de entorno
│
├── 📜 package.json               ← Dependencias
├── 📜 tsconfig.json              ← TypeScript config
├── 📜 next.config.mjs            ← Next.js config
│
├── 🔧 validate-setup.sh          ← Validación (Linux/Mac)
├── 🔧 validate-setup.ps1         ← Validación (Windows)
├── 🔧 test-endpoints.sh          ← Testing (Linux/Mac)
└── 🔧 test-endpoints.ps1         ← Testing (Windows)
```

---

## 🎯 QUICK REFERENCE

### Comandos Más Usados

```bash
# Desarrollo
npm run dev              # Iniciar servidor (http://localhost:3000)
npm install              # Instalar dependencias

# Base de Datos
createdb internal_chat_mvp                          # Crear BD
psql -U postgres -d internal_chat_mvp -f scripts/001_initial_schema.sql  # Crear tablas
psql -U postgres -d internal_chat_mvp -c "\dt"      # Listar tablas

# Producción
npm run build            # Compilar
npm run start            # Iniciar servidor prod

# Testing
./test-endpoints.sh      # Testing automático (Linux/Mac)
./test-endpoints.ps1     # Testing automático (Windows)
```

### URLs Importantes

| Página | URL |
|--------|-----|
| Inicio | http://localhost:3000 |
| Login | http://localhost:3000/login |
| Signup | http://localhost:3000/signup |
| Dashboard | http://localhost:3000/inbox |
| Chats | http://localhost:3000/inbox/conversaciones |
| Agentes | http://localhost:3000/inbox/agentes |
| Configuración | http://localhost:3000/inbox/configuracion |

### Credenciales Demo

```
Email: agent@example.com
Contraseña: password123
```

*(Solo disponibles en modo demo sin DATABASE_URL)*

---

## 🔑 Variables de Entorno

Ver: [.env.example](.env.example)

Esenciales:
- `DATABASE_URL` - Conexión PostgreSQL
- `JWT_SECRET` - Clave para tokens JWT
- `JWT_EXPIRATION` - Expiración de tokens (default: 7d)

Opcionales:
- `TWILIO_ACCOUNT_SID` - Para WhatsApp
- `TWILIO_AUTH_TOKEN` - Para WhatsApp
- `TWILIO_PHONE_NUMBER` - Número Twilio

---

## 📊 ENDPOINTS RESUMEN

### Autenticación (3 endpoints)
```
POST   /api/auth/signup    - Crear cuenta
POST   /api/auth/login     - Iniciar sesión
POST   /api/auth/logout    - Cerrar sesión
```

### Contactos (5 endpoints)
```
POST   /api/contacts              - Crear
GET    /api/contacts              - Listar
GET    /api/contacts/[id]         - Obtener
PATCH  /api/contacts/[id]         - Actualizar
DELETE /api/contacts/[id]         - Eliminar
```

### Conversaciones (6 endpoints)
```
POST   /api/conversations              - Crear
GET    /api/conversations              - Listar
GET    /api/conversations/[id]         - Obtener
PATCH  /api/conversations/[id]         - Actualizar
DELETE /api/conversations/[id]         - Eliminar
POST   /api/conversations/[id]/assign  - Asignar agente
```

### Mensajes (2 endpoints)
```
POST   /api/conversations/[id]/messages  - Enviar
GET    /api/conversations/[id]/messages  - Listar
```

### Órdenes (5 endpoints)
```
POST   /api/orders             - Crear
GET    /api/orders             - Listar
GET    /api/orders/[id]        - Obtener
PATCH  /api/orders/[id]        - Actualizar
DELETE /api/orders/[id]        - Eliminar
```

### Macros (5 endpoints)
```
POST   /api/macros             - Crear
GET    /api/macros             - Listar
GET    /api/macros/[id]        - Obtener
PATCH  /api/macros/[id]        - Actualizar
DELETE /api/macros/[id]        - Eliminar
POST   /api/macros/[id]/use    - Usar macro
```

---

## 🆘 AYUDA RÁPIDA

### El servidor no inicia
```bash
# Verificar Node.js está instalado
node --version

# Instalar dependencias
npm install

# Ejecutar
npm run dev
```

### No puede conectarse a BD
```bash
# Verificar BD está corriendo
psql -U postgres -c "SELECT 1"

# Verificar variable de entorno
cat .env.local | grep DATABASE_URL

# Crear tabla si falta
psql -U postgres -d internal_chat_mvp -f scripts/001_initial_schema.sql
```

### Error al registrarse
1. Verificar `.env.local` tiene `DATABASE_URL`
2. Verificar PostgreSQL está corriendo
3. Usar [test-endpoints.ps1](test-endpoints.ps1) o [test-endpoints.sh](test-endpoints.sh) para testing

Ver guía completa: [QUICK_START.md → Troubleshooting](QUICK_START.md#-troubleshooting)

---

## 📞 RECURSOS EXTERNOS

- **Next.js**: https://nextjs.org/docs
- **PostgreSQL**: https://www.postgresql.org/docs
- **JWT**: https://jwt.io
- **bcryptjs**: https://www.npmjs.com/package/bcryptjs
- **Twilio**: https://www.twilio.com/docs
- **Shadcn UI**: https://ui.shadcn.com

---

## ✅ CHECKLIST PARA EMPEZAR

- [ ] Lee [README.md](README.md)
- [ ] Sigue [QUICK_START.md](QUICK_START.md)
- [ ] Instala PostgreSQL
- [ ] Crea la base de datos
- [ ] Ejecuta script SQL
- [ ] Configura `.env.local`
- [ ] Corre `npm install`
- [ ] Inicia `npm run dev`
- [ ] Accede a http://localhost:3000
- [ ] Prueba signup/login
- [ ] Crea contacto
- [ ] Inicia conversación
- [ ] ¡Felicidades! 🎉

---

## 🎓 PRÓXIMOS PASOS

### Si quieres aprender más
1. Revisa el código en `app/api/` para entender endpoints
2. Estudia `lib/db.ts` para ver cómo se conecta a PostgreSQL
3. Lee `lib/auth.ts` para entender autenticación

### Si quieres extender
1. Agrega nuevos campos a tablas en `scripts/001_initial_schema.sql`
2. Crea nuevos endpoints en `app/api/`
3. Agrega componentes en `components/`

### Si quieres desplegar
1. Elige proveedor (Vercel, Railway, Render)
2. Crea BD remota (Supabase, Railway, etc)
3. Configura variables de entorno
4. Deploy

Ver: [SETUP_GUIDE.md → Despliegue](SETUP_GUIDE.md#-despliegue)

---

## 📝 INFORMACIÓN DEL PROYECTO

| Campo | Valor |
|-------|-------|
| **Nombre** | Internal Chat MVP |
| **Versión** | 1.0.0 |
| **Estado** | Production Ready ✅ |
| **Licencia** | MIT |
| **Stack** | Next.js + PostgreSQL + JWT + Twilio |
| **Node.js** | 18+ requerido |
| **Última actualización** | Enero 2024 |

---

## 🎯 RESUMEN

Este documento es tu **mapa de navegación** para toda la documentación del proyecto.

- **Novato**: Comienza con [QUICK_START.md](QUICK_START.md)
- **Desarrollador**: Lee [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **DevOps**: Usa scripts en `validate-setup.*` y `test-endpoints.*`
- **Validación**: Ver [RESUMEN_FINAL.md](RESUMEN_FINAL.md)

---

**¡Bienvenido al Internal Chat MVP!** 🎉

Para cualquier duda, consulta el documento relevante arriba o los [recursos externos](#-recursos-externos).

**Creado con ❤️ para mejorar la atención al cliente**
