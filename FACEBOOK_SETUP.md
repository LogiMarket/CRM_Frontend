# Integración Facebook Messenger

## ✅ Archivos Implementados

1. **Webhook Endpoint**: `app/api/facebook/webhook/route.ts`
   - Maneja verificación de webhook (GET)
   - Recibe mensajes entrantes (POST)
   - Crea/actualiza contactos, conversaciones y mensajes
   - Obtiene perfil de Facebook del usuario

2. **Envío de Mensajes**: `app/api/facebook/send/route.ts`
   - Envía mensajes via Facebook Graph API
   - Guarda mensajes enviados en la base de datos

3. **Migración de Base de Datos**: `scripts/003_add_multichannel_support.sql`
   - Agrega campos `channel`, `external_user_id`, `external_conversation_id`
   - Crea tabla `webhook_logs` para debugging

## 🔧 Variables de Entorno Requeridas

Agrega estas variables en Railway (CRM_Frontend service):

```bash
# Facebook Messenger Configuration
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token_here
FACEBOOK_VERIFY_TOKEN=your_custom_verify_token_here
```

## 📋 Pasos de Configuración

### 1. Crear App de Facebook

1. Ve a https://developers.facebook.com/apps
2. Crea una nueva app → Tipo: "Business"
3. Agrega el producto "Messenger"

### 2. Configurar Página de Facebook

1. En el Dashboard de la app, ve a Messenger → Settings
2. En "Access Tokens", genera un token para tu página de Facebook
3. Copia el **Page Access Token** → Agregar a Railway como `FACEBOOK_PAGE_ACCESS_TOKEN`

### 3. Configurar Webhook

1. En Messenger Settings → Webhooks
2. Click "Add Callback URL":
   - **Callback URL**: `https://crmfrontend-production-cc45.up.railway.app/api/facebook/webhook`
   - **Verify Token**: Crea uno personalizado (ej: "mitoken123") → Agregar a Railway como `FACEBOOK_VERIFY_TOKEN`
3. Subscribir a estos eventos:
   - `messages`
   - `messaging_postbacks` (opcional)
   - `message_deliveries` (opcional)
   - `message_reads` (opcional)

4. Subscribir la página de Facebook al webhook

### 4. Ejecutar Migración de Base de Datos

En Railway, ejecuta el script de migración:

```bash
psql $DATABASE_URL -f scripts/003_add_multichannel_support.sql
```

O usando el script Node.js:

```bash
node scripts/migrate-003.mjs
```

### 5. Probar la Integración

1. Envía un mensaje a tu página de Facebook desde una cuenta de prueba
2. Verifica en Railway logs que el webhook recibe el mensaje
3. Verifica en la base de datos:
   ```sql
   SELECT * FROM webhook_logs WHERE channel = 'facebook' ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM conversations WHERE channel = 'facebook';
   SELECT * FROM messages WHERE channel = 'facebook';
   ```
4. La conversación debería aparecer en el inbox con el ícono de Facebook

## 🔍 Debugging

### Ver logs de webhooks:
```sql
SELECT * FROM webhook_logs WHERE channel = 'facebook' ORDER BY created_at DESC LIMIT 10;
```

### Ver mensajes de Facebook:
```sql
SELECT 
  m.id, 
  m.content, 
  m.sender_type, 
  m.direction,
  m.external_message_id,
  m.created_at,
  c.channel
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE c.channel = 'facebook'
ORDER BY m.created_at DESC
LIMIT 20;
```

### Verificar conversaciones de Facebook:
```sql
SELECT 
  c.id,
  c.status,
  c.channel,
  c.external_user_id,
  contacts.name as contact_name,
  c.created_at
FROM conversations c
LEFT JOIN contacts ON c.contact_id = contacts.id
WHERE c.channel = 'facebook'
ORDER BY c.created_at DESC;
```

## 📱 Envío de Mensajes

Para enviar un mensaje a Facebook desde el chat:

```typescript
const response = await fetch('/api/facebook/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recipientId: 'FACEBOOK_PSID',  // external_user_id del contact
    message: 'Hola desde el CRM',
    conversationId: 'conversation_id_here'
  })
})
```

## ⚠️ Limitaciones y Notas

1. **Window de 24h**: Solo puedes enviar mensajes de marketing/promocionales dentro de las 24h después de que el usuario te escribió
2. **Modo de Desarrollo**: En modo dev, solo usuarios de prueba pueden interactuar con el bot
3. **Revisión de Facebook**: Para producción, necesitas enviar la app a revisión (requiere `pages_messaging` permission)
4. **Rate Limits**: Facebook tiene límites de tasa, manéjalos con retry logic si es necesario

## 🎯 Próximos Pasos

- [ ] Actualizar `chat-area.tsx` para detectar el channel y enviar por Facebook o WhatsApp
- [ ] Agregar ícono de Facebook en conversation-list.tsx según el channel
- [ ] Implementar manejo de templates de Facebook (para mensajes fuera de la ventana de 24h)
- [ ] Agregar manejo de attachments (imágenes, videos)
- [ ] Implementar quick replies y botones interactivos
