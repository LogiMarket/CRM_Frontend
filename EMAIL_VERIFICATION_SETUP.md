# Configuración de Verificación de Email

## Pasos de Configuración

### 1. Instalar Nodemailer (Frontend)

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### 2. Configurar Variables de Entorno (.env.local)

Agrega las siguientes variables a tu archivo `.env.local`:

```env
# Existing
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
NEXT_PUBLIC_API_URL=http://localhost:3000

# Email Configuration (Gmail SMTP)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password
```

**Nota importante**: Para usar Gmail, necesitas:
1. Activar la autenticación de dos factores en tu cuenta Google
2. Generar una "contraseña de aplicación" en: https://myaccount.google.com/apppasswords
3. Usar esa contraseña en `EMAIL_PASSWORD` (no la contraseña normal de Gmail)

### 3. Actualizar Schema de Base de Datos

Ejecuta el siguiente SQL en tu base de datos PostgreSQL:

```sql
-- Agregar columnas para verificación de email a la tabla users
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN verification_code TEXT;

-- Crear índice para búsquedas más rápidas
CREATE INDEX idx_users_email_verified ON users(email_verified);
```

O si prefieres usar psql:

```bash
psql -d your_database_name -c "ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;"
psql -d your_database_name -c "ALTER TABLE users ADD COLUMN verification_code TEXT;"
psql -d your_database_name -c "CREATE INDEX idx_users_email_verified ON users(email_verified);"
```

## Flujo de Verificación de Email

### Registro (Signup)
1. Usuario completa el formulario en `/signup`
2. Endpoint `/api/auth/signup` valida los datos
3. Se crea el usuario con `email_verified = false`
4. Se genera un código de verificación aleatorio
5. Se envía un email con un enlace de verificación
6. Frontend muestra mensaje "Verifica tu correo"
7. Usuario recibe un email con botón "Verificar Email"

### Verificación
1. Usuario hace clic en el enlace del email o ingresa el código manualmente en `/verify-email`
2. El código se valida contra el hash almacenado
3. Se marca el email como verificado (`email_verified = true`)
4. Se envía email de bienvenida
5. Usuario es redirigido a `/login` para iniciar sesión

### Reenvío de Email
1. Usuario hace clic en "Reenviar correo de verificación"
2. Se genera un nuevo código
3. Se envía el email nuevamente

## Archivos Creados/Modificados

### Nuevos Archivos
- **app/api/auth/verify-email/route.ts** - Endpoint para verificar el código
- **app/api/auth/resend-verification/route.ts** - Endpoint para reenviar el email
- **app/verify-email/page.tsx** - Página de verificación con forma manual o automática
- **lib/email.ts** - Funciones para enviar emails

### Archivos Modificados
- **app/api/auth/signup/route.ts** - Agregado verificación de email, generación de código
- **app/signup/page.tsx** - Agregado UI de verificación de email, manejo del estado
- **package.json** - Debe incluir `nodemailer` como dependencia

## Endpoints

### POST /api/auth/signup
Crear nuevo usuario y enviar email de verificación

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Usuario"
}
```

**Response (201):**
```json
{
  "message": "Usuario creado exitosamente. Verifica tu correo.",
  "access_token": "jwt-token",
  "requiresVerification": true,
  "emailSent": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Usuario",
    "email_verified": false
  }
}
```

### GET /api/auth/verify-email?code=XXX&email=user@example.com
Verificar el código de verificación

**Response (200):**
```json
{
  "message": "Email verificado exitosamente. Ya puedes iniciar sesión."
}
```

### POST /api/auth/resend-verification
Reenviar el email de verificación

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "Email de verificación reenviado exitosamente"
}
```

## Testing

### 1. Test Modo Demo (sin base de datos)
- La aplicación detecta que no hay DATABASE_URL
- El signup retorna un usuario demo con `email_verified: true`
- No se envían emails reales

### 2. Test con Base de Datos Real
```bash
# 1. Asegúrate de tener las variables de entorno configuradas
echo "DATABASE_URL=postgresql://..."
echo "EMAIL_USER=your-gmail@example.com"
echo "EMAIL_PASSWORD=your-app-password"

# 2. Inicia la aplicación
npm run dev

# 3. Ve a http://localhost:3000/signup
# 4. Completa el formulario
# 5. Revisa tu email
# 6. Haz clic en el enlace o ve a /verify-email
```

## Solución de Problemas

### "Error: transporter is not defined"
- Asegúrate que `EMAIL_USER` y `EMAIL_PASSWORD` están configuradas en `.env.local`
- Reinicia el servidor de desarrollo

### "Error: Code 535 - Please log in via your web browser"
- Gmail rechazó tu contraseña
- Asegúrate de usar una "Contraseña de aplicación" (app password), no la contraseña normal
- Genera una nueva en: https://myaccount.google.com/apppasswords

### "Tabla users no existe" o "Columna email_verified no existe"
- Ejecuta el SQL de configuración de la base de datos
- Verifica que estés conectado a la base de datos correcta

### "Email nunca llega"
- Revisa la carpeta de spam/junk
- Verifica que `NEXT_PUBLIC_API_URL` sea correcta (por defecto http://localhost:3000)
- Revisa la consola del servidor para mensajes de error

## Seguridad

- Los códigos de verificación se hashean con bcryptjs (misma algoritmo que contraseñas)
- Códigos validos por defecto: cada recarga genera uno nuevo
- JWTs contienen `emailVerified: false` mientras no se verifique el email
- Verificar email no requiere estar autenticado (endpoint público GET)

## Futuras Mejoras

- [ ] Expiración de códigos de verificación (ej: 24 horas)
- [ ] Límite de reintentos de verificación
- [ ] Verificación de email requerida para login
- [ ] Reset de contraseña por email
- [ ] 2FA (autenticación de dos factores)
