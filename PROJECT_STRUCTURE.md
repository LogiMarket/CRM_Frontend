# 📁 Estructura del Proyecto - Guía Rápida

## Organización Final

```
internal-chat-mvp/
│
├── 📱 FRONTEND (Next.js 15)
│   ├── app/                    # App Router de Next.js
│   │   ├── inbox/             # Dashboard principal
│   │   ├── login/             # Páginas de autenticación
│   │   ├── signup/
│   │   ├── api/               # API routes (deprecated - usar backend)
│   │   └── layout.tsx
│   │
│   ├── components/            # Componentes React reutilizables
│   │   ├── chat-area.tsx
│   │   ├── conversation-list.tsx
│   │   ├── inbox-sidebar.tsx
│   │   └── ui/               # Shadcn/UI components
│   │
│   ├── lib/                  # Funciones y utilidades
│   │   ├── utils.ts
│   │   ├── auth.ts
│   │   └── db.ts
│   │
│   ├── hooks/                # Custom React hooks
│   │   └── use-mobile.ts
│   │
│   ├── styles/               # Estilos globales
│   │   └── globals.css
│   │
│   ├── next.config.mjs
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example          # Variables del frontend
│
│
├── 🚀 BACKEND (NestJS)       ← TODO EN ESTA CARPETA
│   │
│   ├── src/
│   │   ├── main.ts           # Punto de entrada
│   │   ├── app.module.ts     # Módulo principal
│   │   │
│   │   ├── config/
│   │   │   └── database.config.ts
│   │   │
│   │   └── modules/          # Módulos de la aplicación
│   │       ├── auth/         # 🔐 Autenticación JWT
│   │       ├── users/        # 👥 Gestión de usuarios
│   │       ├── contacts/     # 📱 Contactos WhatsApp
│   │       ├── conversations/# 💬 Conversaciones
│   │       ├── messages/     # 💌 Mensajes
│   │       ├── orders/       # 📦 Órdenes
│   │       ├── macros/       # 🏷️ Respuestas rápidas
│   │       └── whatsapp/     # 🔗 Integración Twilio
│   │
│   ├── docs/                 # 📚 DOCUMENTACIÓN DEL BACKEND
│   │   ├── TWILIO_SETUP.md          # Configuración de Twilio (paso a paso)
│   │   ├── DEPLOYMENT_GUIDE.md      # Despliegue en Railway
│   │   ├── DEPLOYMENT_CHECKLIST.md  # Checklist de despliegue
│   │   ├── NEXT_STEPS.md            # Próximos pasos después de instalación
│   │   ├── TWILIO_MIGRATION_SUMMARY.md
│   │   ├── DOCKER_SETUP.md          # Configuración de Docker
│   │   └── REORGANIZATION_SUMMARY.md # Resumen de reorganización
│   │
│   ├── docker-compose.yml    # 🐳 PostgreSQL + pgAdmin local
│   ├── run-dev.sh           # 🔧 Script desarrollo Linux/Mac
│   ├── run-dev.bat          # 🔧 Script desarrollo Windows
│   ├── .env.example         # Variables del backend
│   ├── package.json         # Dependencias NestJS
│   ├── tsconfig.json
│   ├── nest-cli.json
│   └── README.md            # 📖 Documentación completa del backend
│
│
├── 📚 DOCUMENTACIÓN DEL PROYECTO (Raíz)
│   ├── README.md                 # README principal
│   ├── GETTING_STARTED.md        # Guía de inicio general
│   ├── FRONTEND_INTEGRATION.md   # Integración frontend con backend
│   └── docker-compose.yml        # (Eliminado - ahora en backend/)
│
├── Otros archivos
│   ├── next-env.d.ts
│   ├── components.json
│   ├── postcss.config.mjs
│   ├── proxy.ts
│   ├── .gitignore
│   ├── package.json              # Dependencias frontend
│   └── pnpm-lock.yaml
```

## 🎯 Qué Hay en Cada Lugar

### Backend (`backend/`)
**Todo lo relacionado con el servidor NestJS**

| Archivo/Carpeta | Descripción |
|-----------------|-------------|
| `src/` | Código fuente del backend |
| `docs/` | Documentación del backend |
| `docker-compose.yml` | Base de datos PostgreSQL local |
| `README.md` | Documentación completa |
| `.env.example` | Variables de entorno necesarias |
| `package.json` | Dependencias del backend |

### Frontend (Raíz del proyecto)
**Código de Next.js y componentes React**

| Carpeta | Descripción |
|---------|-------------|
| `app/` | Páginas y rutas de Next.js |
| `components/` | Componentes React reutilizables |
| `lib/` | Funciones y utilidades |
| `hooks/` | Custom React hooks |
| `styles/` | Estilos CSS |

### Documentación (Raíz del proyecto)
**Guías y documentación del proyecto completo**

| Archivo | Descripción |
|---------|-------------|
| `README.md` | Documentación principal |
| `GETTING_STARTED.md` | Guía de inicio |
| `FRONTEND_INTEGRATION.md` | Cómo conectar frontend con backend |

---

## 🚀 Comandos Rápidos

### Iniciar todo

```bash
# Terminal 1 - Backend
cd backend
pnpm install
docker-compose up -d
pnpm start:dev

# Terminal 2 - Frontend
pnpm install
pnpm dev
```

### Solo Backend

```bash
cd backend
pnpm install
docker-compose up -d      # PostgreSQL
pnpm start:dev           # Servidor NestJS
```

### Solo Frontend

```bash
pnpm install
pnpm dev
```

---

## 📍 Dónde Encontrar Cada Cosa

### "Necesito documentación del backend"
→ Ve a `backend/docs/`

### "Necesito documentación del proyecto completo"
→ Empieza en `README.md`

### "Quiero entender cómo funciona la app"
→ Lee `GETTING_STARTED.md`

### "Necesito integrar frontend con backend"
→ Lee `FRONTEND_INTEGRATION.md`

### "Quiero configurar Twilio"
→ Lee `backend/docs/TWILIO_SETUP.md`

### "Voy a desplegar a producción"
→ Sigue `backend/docs/DEPLOYMENT_CHECKLIST.md`

### "Necesito código del backend"
→ Está en `backend/src/`

### "Necesito código del frontend"
→ Está en `app/` y `components/`

---

## ✅ Verificación Rápida

Para verificar que todo está en su lugar:

```bash
# Ver estructura del backend
ls -la backend/

# Ver documentación del backend
ls -la backend/docs/

# Ver código del backend
ls -la backend/src/

# Ver frontend
ls -la app/
ls -la components/
```

---

## 🎓 Próximos Pasos

1. **Leer documentación**
   - `README.md` - Vista general
   - `GETTING_STARTED.md` - Guía detallada

2. **Configurar y ejecutar**
   - Seguir instrucciones en `README.md`

3. **Desarrollo**
   - Backend: `backend/README.md`
   - Frontend: `FRONTEND_INTEGRATION.md`

4. **Producción**
   - Seguir: `backend/docs/DEPLOYMENT_CHECKLIST.md`

---

**Última actualización**: Enero 10, 2026  
**Estado**: ✅ Estructura limpia y organizada
