# Internal Chat MVP - Email Verification System 📧

Bienvenido al proyecto **Internal Chat MVP** con sistema completo de **verificación de email**.

## 🎯 Qué es esto?

Un sistema full-stack de chat interno para equipos con:
- ✅ **Registro de usuarios** con verificación de email
- ✅ **Autenticación segura** con JWT tokens
- ✅ **Sistema de conversaciones** en tiempo real
- ✅ **Panel de agentes** para gestión de usuarios

## 🚀 Quick Start (5 minutos)

### 1. Clonar y Instalar
```bash
git clone <repo-url>
cd internal-chat-mvp
npm install
npm install nodemailer @types/nodemailer
```

### 2. Configurar Variables de Entorno
```bash
# Copiar .env.example a .env.local
cp .env.example .env.local

# Agregar a .env.local:
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password
DATABASE_URL=postgresql://user:pass@localhost/dbname
JWT_SECRET=tu-secret-key-aqui
```

### 3. Base de Datos
```bash
# Ejecutar migrations
psql -d tu_db -f scripts/001_initial_schema.sql
psql -d tu_db -f scripts/002_seed_data.sql
psql -d tu_db -f scripts/003_email_verification_schema.sql
```

### 4. Iniciar
```bash
npm run dev
# http://localhost:3000
```

### 5. Probar
1. Ve a http://localhost:3000/signup
2. Completa el formulario
3. Verifica tu email
4. ¡Listo! Puedes iniciar sesión

---

## 📚 Documentación

| Documento | Descripción | Tiempo |
|-----------|------------|--------|
| **[QUICK_START_EMAIL.md](./QUICK_START_EMAIL.md)** | Setup en 5 minutos | 5 min |
| **[EMAIL_VERIFICATION_SETUP.md](./EMAIL_VERIFICATION_SETUP.md)** | Guía completa | 10 min |
| **[ENV_VARIABLES_GUIDE.md](./ENV_VARIABLES_GUIDE.md)** | Variables de entorno | 10 min |
| **[API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md)** | Testing con cURL/Postman | 10 min |
| **[EMAIL_VERIFICATION_IMPLEMENTATION.md](./EMAIL_VERIFICATION_IMPLEMENTATION.md)** | Detalles técnicos | 15 min |
| **[IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)** | Checklist final | 5 min |

---

## 🔄 Flujo de Registro

```
┌─────────────────────┐
│  Usuario en /signup │
└──────────┬──────────┘
           │ Completa formulario
           ▼
┌─────────────────────────────────────────┐
│  POST /api/auth/signup                  │
│  • Valida email y contraseña            │
│  • Genera código de verificación        │
│  • Envía email con código               │
└──────────┬──────────────────────────────┘
           │ requiresVerification: true
           ▼
┌─────────────────────────────────────────┐
│  Frontend muestra:                      │
│  "Verifica tu correo"                   │
│  Botón "Reenviar correo"                │
└──────────┬──────────────────────────────┘
           │ Usuario haz clic en email
           ▼
┌─────────────────────────────────────────┐
│  GET /api/auth/verify-email?code=...    │
│  • Compara código hash                  │
│  • Marca email_verified = true          │
│  • Envía email de bienvenida            │
└──────────┬──────────────────────────────┘
           │ Redirige a /login
           ▼
┌─────────────────────────────────────────┐
│  Usuario puede hacer LOGIN ✅           │
└─────────────────────────────────────────┘
```

---

## 🏗️ Estructura del Proyecto

```
internal-chat-mvp/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── signup/route.ts .................. Crear usuario
│   │   │   ├── verify-email/route.ts ........... Verificar email
│   │   │   ├── resend-verification/route.ts ... Reenviar código
│   │   │   ├── login/route.ts .................. Iniciar sesión
│   │   │   ├── logout/route.ts ................. Cerrar sesión
│   │   │   └── me/route.ts ..................... Usuario actual
│   │   ├── conversations/
│   │   ├── messages/
│   │   ├── orders/
│   │   └── users/
│   ├── signup/page.tsx ......................... Formulario de registro
│   ├── verify-email/page.tsx ................... Verificación de email
│   ├── login/page.tsx .......................... Iniciar sesión
│   ├── inbox/page.tsx .......................... Dashboard principal
│   └── layout.tsx ............................. Layout raíz
├── components/
│   ├── chat-area.tsx
│   ├── conversation-list.tsx
│   ├── orders-panel.tsx
│   └── ui/ ..................................... Componentes Shadcn
├── lib/
│   ├── db.ts ................................... Conexión PostgreSQL
│   ├── auth.ts .................................. Utilidades JWT
│   ├── email.ts ................................. Envío de emails ✨
│   ├── session.ts ............................... Gestión de sesiones
│   └── utils.ts ................................. Utilidades varias
├── public/ ...................................... Assets estáticos
├── scripts/
│   ├── 001_initial_schema.sql ................... Crear tablas
│   ├── 002_seed_data.sql ........................ Datos de prueba
│   └── 003_email_verification_schema.sql ....... Email verification ✨
└── [Documentación]
    ├── QUICK_START_EMAIL.md ..................... Setup rápido ✨
    ├── EMAIL_VERIFICATION_SETUP.md ............. Guía completa ✨
    ├── ENV_VARIABLES_GUIDE.md .................. Variables env ✨
    ├── API_TESTING_GUIDE.md ..................... Testing ✨
    └── IMPLEMENTATION_CHECKLIST.md ............. Checklist ✨
```

---

## 🔐 Seguridad

### Implementado
- ✅ JWT tokens con 7 días de expiración
- ✅ Contraseñas hasheadas con bcryptjs
- ✅ Códigos de verificación hasheados
- ✅ 256 bits de entropía en códigos aleatorios
- ✅ Validación de entrada en backend
- ✅ Manejo de errores sin exposición de lógica

### Recomendado para Producción
- 🔜 Rate limiting en endpoints
- 🔜 Expiración de códigos (24 horas)
- 🔜 CORS configurado
- 🔜 HTTPS obligatorio
- 🔜 2FA (autenticación de dos factores)

---

## 🛠️ Tecnologías

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Next.js 15, React 18, TypeScript |
| **UI** | Tailwind CSS, Shadcn/UI |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL |
| **Auth** | JWT + bcryptjs |
| **Email** | Nodemailer + Gmail SMTP |
| **Deployment** | Vercel / Similar |

---

## 📦 Dependencias Principales

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.1.0",
    "nodemailer": "^6.9.0",
    "postgres": "^3.4.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## 🧪 Testing

### Manual
1. Ir a http://localhost:3000/signup
2. Llenar formulario
3. Recibir email
4. Hacer clic en enlace
5. Iniciar sesión

### Automático
```bash
# Ver API_TESTING_GUIDE.md para:
# - Ejemplos con cURL
# - Colección de Postman
# - Tests manuales
```

---

## 🚀 Deployment

### Vercel (Recomendado)
```bash
npm install -g vercel
vercel login
vercel
```

### Otros Proveedores
- Heroku
- Railway
- Render
- AWS

Ver documentación específica en cada plataforma.

---

## 🐛 Problemas Comunes

### "Email never arrives"
→ Revisar carpeta SPAM

### "Error: transporter is not defined"
→ EMAIL_USER y EMAIL_PASSWORD no configurados

### "Database connection error"
→ DATABASE_URL incorrecta o PostgreSQL no corriendo

### "401 Unauthorized"
→ JWT_SECRET cambió entre requests

Ver **EMAIL_VERIFICATION_SETUP.md** para más soluciones.

---

## 📊 API Endpoints

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Crear usuario con verificación |
| GET | `/api/auth/verify-email` | Verificar código |
| POST | `/api/auth/resend-verification` | Reenviar código |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET | `/api/auth/me` | Datos del usuario actual |

### Conversaciones
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/conversations` | Listar conversaciones |
| POST | `/api/conversations` | Crear conversación |
| GET | `/api/conversations/[id]` | Obtener detalles |
| GET | `/api/conversations/[id]/messages` | Mensajes |
| POST | `/api/conversations/[id]/messages` | Enviar mensaje |

---

## 👥 Roles de Usuario

| Rol | Permisos |
|-----|----------|
| **admin** | Acceso total |
| **agent** | Gestionar conversaciones |
| **supervisor** | Supervisar agentes |

---

## 📈 Roadmap

- [x] Sistema de autenticación
- [x] Verificación de email
- [x] Conversaciones básicas
- [x] Panel de agentes
- [ ] Notificaciones en tiempo real
- [ ] Asignación inteligente
- [ ] Análisis de conversaciones
- [ ] Macros personalizadas
- [ ] Integración con Twilio
- [ ] Dashboard de métricas

---

## 📞 Soporte

1. **Lee la documentación**: [QUICK_START_EMAIL.md](./QUICK_START_EMAIL.md)
2. **Revisa los logs**: `npm run dev`
3. **Checkea variables**: `.env.local`
4. **Verifica la DB**: `psql -l`

---

## 📄 Licencia

MIT License - Ver [LICENSE](./LICENSE) para detalles.

---

## 🎉 ¡Listo!

Tu sistema de verificación de email está completamente implementado.

**Próximo paso**: Lee [QUICK_START_EMAIL.md](./QUICK_START_EMAIL.md) (5 minutos)

---

**Última actualización**: 2024
**Versión**: 1.0.0 - Email Verification Complete
