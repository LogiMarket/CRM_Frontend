# Email Verification API - Testing Guide

## Ejemplos de cURL para Probar los Endpoints

### 1. Signup (Crear Usuario)

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

**Response (201):**
```json
{
  "message": "Usuario creado exitosamente. Verifica tu correo.",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": "7d",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "agent",
    "status": "available",
    "email_verified": false
  },
  "requiresVerification": true,
  "emailSent": true
}
```

---

### 2. Verify Email (Verificar Código)

**Opción A: Con código de verificación**

Espera a recibir el email, copia el enlace que contiene. Será algo como:
```
http://localhost:3000/verify-email?code=ABC123DEF456...&email=user@example.com
```

Luego ejecuta:

```bash
curl -X GET "http://localhost:3000/api/auth/verify-email?code=ABC123DEF456&email=user@example.com"
```

**Response (200):**
```json
{
  "message": "Email verificado exitosamente. Ya puedes iniciar sesión."
}
```

**Opción B: Manual (sin código)**

Si el código está en formato largo, puedes hacer:

```bash
# Primero, URL-encode el code
CODE="largo-codigo-de-verificacion-aqui"
EMAIL="user@example.com"

curl -X GET "http://localhost:3000/api/auth/verify-email" \
  --data-urlencode "code=$CODE" \
  --data-urlencode "email=$EMAIL"
```

---

### 3. Resend Verification Email

```bash
curl -X POST http://localhost:3000/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

**Response (200):**
```json
{
  "message": "Email de verificación reenviado exitosamente"
}
```

---

## Flujo Completo de Test

```bash
#!/bin/bash

# 1. Crear usuario
echo "1️⃣ Creando usuario..."
SIGNUP_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }')

echo "Response: $SIGNUP_RESPONSE"
echo ""

# 2. Extraer datos
EMAIL=$(echo $SIGNUP_RESPONSE | jq -r '.user.email')
echo "2️⃣ Email registrado: $EMAIL"
echo "⏳ Espera a recibir el email de verificación..."
echo ""

# 3. (Manual) - Haz clic en el enlace del email que recibiste
# O si tienes el código:

echo "3️⃣ Verificando email (necesitas el código del email)..."
echo "Copia el código del email y ejecuta:"
echo ""
echo "curl -X GET 'http://localhost:3000/api/auth/verify-email?code=CODIGO_AQUI&email=$EMAIL'"
```

---

## Testing con Postman

### Colección de Postman

```json
{
  "info": {
    "name": "Email Verification API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Signup",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"{{user_email}}\",\n  \"password\": \"password123\",\n  \"name\": \"Test User\"\n}"
        },
        "url": {
          "raw": "http://localhost:3000/api/auth/signup",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "auth", "signup"]
        }
      }
    },
    {
      "name": "2. Verify Email",
      "request": {
        "method": "GET",
        "url": {
          "raw": "http://localhost:3000/api/auth/verify-email?code={{verification_code}}&email={{user_email}}",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "auth", "verify-email"],
          "query": [
            {
              "key": "code",
              "value": "{{verification_code}}"
            },
            {
              "key": "email",
              "value": "{{user_email}}"
            }
          ]
        }
      }
    },
    {
      "name": "3. Resend Verification",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"{{user_email}}\"\n}"
        },
        "url": {
          "raw": "http://localhost:3000/api/auth/resend-verification",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "auth", "resend-verification"]
        }
      }
    }
  ]
}
```

### Variables de Postman
```
user_email: test@example.com
verification_code: [el código del email]
```

---

## Testing en el Frontend

### En /signup
1. Llena: email, password, name
2. Haz clic "Crear cuenta"
3. Espera a ver: "Verifica tu correo"
4. Haz clic "Reenviar correo de verificación" (opcional)

### En /verify-email
1. El email contiene un enlace: `/verify-email?code=...&email=...`
2. Haz clic en el enlace → se verifica automáticamente
3. O entra manualmente en `/verify-email`
4. Ingresa email y código
5. Haz clic "Verificar correo"

### Luego en /login
1. Usa el email y password
2. Deberías poder iniciar sesión

---

## Verificación en la Base de Datos

```sql
-- Ver usuario sin verificar
SELECT id, email, name, email_verified, verification_code 
FROM users 
WHERE email = 'user@example.com';

-- Resultado esperado ANTES de verificar:
-- id | email          | name      | email_verified | verification_code
-- ---|----------------|-----------|----------------|-------------------
-- 123| user@example.com | John Doe | false          | [hash bcrypt]

-- Resultado esperado DESPUÉS de verificar:
-- id | email          | name      | email_verified | verification_code
-- ---|----------------|-----------|----------------|-------------------
-- 123| user@example.com | John Doe | true           | NULL
```

---

## Logs Esperados en el Servidor

```
POST /api/auth/signup
Response: 201 Created
{
  "requiresVerification": true,
  "emailSent": true
}

GET /api/auth/verify-email?code=...&email=...
Response: 200 OK
{
  "message": "Email verificado exitosamente"
}
```

---

## Casos de Error

### Email ya existe
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "existing@example.com",
    "password": "password123",
    "name": "John"
  }'
```
**Response (409):**
```json
{
  "error": "Este email ya está registrado"
}
```

### Código inválido
```bash
curl -X GET "http://localhost:3000/api/auth/verify-email?code=codigo-invalido&email=user@example.com"
```
**Response (401):**
```json
{
  "error": "Código de verificación inválido"
}
```

### Usuario no encontrado
```bash
curl -X POST http://localhost:3000/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "noexiste@example.com"}'
```
**Response (404):**
```json
{
  "error": "Usuario no encontrado"
}
```

### Email ya verificado
```bash
curl -X GET "http://localhost:3000/api/auth/verify-email?code=...&email=user@example.com"
# (usuario ya verificado)
```
**Response (200):**
```json
{
  "message": "Email ya fue verificado anteriormente"
}
```

---

## Modo Demo (sin base de datos)

Si `DATABASE_URL` no está configurada, el signup retorna:

```json
{
  "message": "Usuario creado exitosamente (modo demo)",
  "requiresVerification": false,
  "user": {
    "id": "random-id",
    "email": "test@example.com",
    "name": "Usuario",
    "email_verified": true
  }
}
```

En modo demo, **no se requiere verificación de email**.
