# ✅ Migración 003 Completada

## Estado: APLICADA EXITOSAMENTE

**Fecha**: 19 de enero de 2026
**Endpoint utilizado**: `POST /api/migrate`

## Campos Agregados

### ✅ Tabla `contacts`
- `channel` (VARCHAR) - Default: 'whatsapp'
- `external_user_id` (VARCHAR)
- Índice: `idx_contacts_external_user`

### ✅ Tabla `conversations`
- `channel` (VARCHAR) - Default: 'whatsapp'
- `external_user_id` (VARCHAR)
- `external_conversation_id` (VARCHAR)
- `comments` (TEXT)
- Índice: `idx_conversations_channel`
- Índice: `idx_conversations_external_user`

### ✅ Tabla `messages`
- `channel` (VARCHAR) - Default: 'whatsapp'
- `external_message_id` (VARCHAR)
- `direction` (VARCHAR) - Default: 'inbound'
- Índice: `idx_messages_external_id`
- Índice: `idx_messages_direction`

### ✅ Nueva Tabla `webhook_logs`
```sql
CREATE TABLE webhook_logs (
  id SERIAL PRIMARY KEY,
  channel VARCHAR(50) NOT NULL,
  external_id VARCHAR(255),
  payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```
- Índice: `idx_webhook_logs_channel`
- Índice: `idx_webhook_logs_processed`

## Verificación

Para verificar el estado en cualquier momento:

```bash
curl -X GET "https://crmfrontend-production-cc45.up.railway.app/api/migrate" \
  -H "Authorization: Bearer migrate_secret_2026"
```

O en PowerShell:
```powershell
$headers = @{ Authorization = "Bearer migrate_secret_2026" }
Invoke-RestMethod -Uri "https://crmfrontend-production-cc45.up.railway.app/api/migrate" -Method GET -Headers $headers
```

## Próximos Pasos

### 1. Configurar Variables de Facebook en Railway

Ve a **Railway → CRM_Frontend → Variables**:

```bash
FACEBOOK_PAGE_ACCESS_TOKEN=EAAxxxxxx     # De Facebook Developers
FACEBOOK_VERIFY_TOKEN=logimarket_2026   # Lo inventas tú
```

### 2. Configurar Webhook en Facebook

1. https://developers.facebook.com/apps
2. Tu App → Messenger → Settings → Webhooks
3. Add Callback URL:
   - URL: `https://crmfrontend-production-cc45.up.railway.app/api/facebook/webhook`
   - Verify Token: `logimarket_2026` (el mismo que pusiste en Railway)
4. Subscribe to events: `messages`, `messaging_postbacks`
5. Subscribe page to webhook

### 3. Probar

1. Envía un mensaje desde Facebook a tu página
2. Verifica logs en Railway
3. La conversación debería aparecer con ícono 💬 azul
4. Los mensajes se guardarán con `channel='facebook'`

## Consultas SQL Útiles

### Ver webhooks recibidos:
```sql
SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 10;
```

### Ver conversaciones por canal:
```sql
SELECT 
  channel, 
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count
FROM conversations
GROUP BY channel;
```

### Ver mensajes por canal y dirección:
```sql
SELECT 
  channel,
  direction,
  COUNT(*) as total
FROM messages
GROUP BY channel, direction
ORDER BY channel, direction;
```

## Endpoint de Migración

**Propósito**: Permitir ejecutar migraciones desde Railway sin necesidad de acceso directo a la BD.

**Métodos**:
- `GET /api/migrate` - Verificar estado de la migración
- `POST /api/migrate` - Ejecutar la migración

**Seguridad**: 
- Requiere header `Authorization: Bearer migrate_secret_2026`
- Configurar `MIGRATION_TOKEN` en Railway para cambiar el token

**Nota**: Este endpoint puede dejarse activo para futuras migraciones o deshabilitarse después de la implementación inicial.

---

**Estado Final**: ✅ Sistema listo para recibir mensajes de Facebook Messenger
