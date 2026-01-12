# ⚡ Quick Start - Email Verification

## En 5 Minutos

### Paso 1: Instalar Dependencias
```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### Paso 2: Configurar Gmail (2 minutos)

1. Abre tu cuenta Google: https://myaccount.google.com
2. Ve a **Seguridad** (izquierda)
3. Activa **Autenticación de dos factores** (si no la tienes)
4. Ve a **Contraseñas de aplicaciones**
5. Selecciona **Correo** y **Windows**
6. Copia la contraseña que genera Google

### Paso 3: Configurar .env.local
```env
# Agrega estas líneas a .env.local
EMAIL_USER=tu-correo@gmail.com
EMAIL_PASSWORD=contraseña-generada-por-google
```

### Paso 4: Ejecutar Migración SQL
```bash
# En PostgreSQL o psql:
psql -d tu_base_datos -f scripts/003_email_verification_schema.sql

# O copia y ejecuta manualmente:
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN verification_code TEXT;
```

### Paso 5: Reinicia y Prueba
```bash
npm run dev
```

Abre: http://localhost:3000/signup

---

## ✅ Checklist

- [ ] `nodemailer` instalado
- [ ] Contraseña de aplicación Google generada
- [ ] `.env.local` actualizado con EMAIL_USER y EMAIL_PASSWORD
- [ ] SQL migration ejecutada
- [ ] Servidor reiniciado (`npm run dev`)

## 🧪 Test

1. Llena el formulario de signup
2. Haz clic en "Crear cuenta"
3. Verás: **"Verifica tu correo"**
4. Revisa tu email (incluyendo spam)
5. Haz clic en **"Verificar Email"** en el email
6. ¡Listo! Ahora puedes hacer login

## ❓ Problemas Comunes

### "Email nunca llega"
→ Revisa la carpeta de **SPAM**

### "Error: transporter is not defined"
→ EMAIL_USER o EMAIL_PASSWORD no está configurado → Reinicia server

### "Error: 535 - Please log in via web browser"
→ Estás usando tu contraseña normal de Gmail → Usa la contraseña de aplicación

### "Table users no existe"
→ Ejecuta el SQL en la sección Paso 4

---

## 📖 Documentación Completa

Lee **EMAIL_VERIFICATION_SETUP.md** para más detalles y troubleshooting.
