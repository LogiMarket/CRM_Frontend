# Actualización: Funcionalidad de Editar y Eliminar Comentarios

## Resumen
Se ha implementado la funcionalidad para **actualizar** y **eliminar** comentarios individuales. Los comentarios ahora se almacenan en formato JSON con estructura individual en lugar de texto concatenado.

## Cambios Implementados

### 1. Backend - Endpoints de API
**Archivo**: `app/api/conversations/[id]/comments/route.ts`

#### Nuevas capacidades:
- **PUT** - Actualizar un comentario específico
  - Busca por `commentId` 
  - Actualiza el texto del comentario
  - Retorna el array de comentarios actualizado

- **DELETE** - Eliminar un comentario específico
  - Busca por `commentId`
  - Remueve el comentario del array
  - Retorna el array de comentarios actualizado

### 2. Estructura de datos
**Antes**: Texto concatenado con saltos de línea
```
"comentario 1\ncomentario 2\ncomentario 3"
```

**Después**: Array JSON con objetos individuales
```json
[
  {
    "id": "1234567890",
    "text": "comentario 1",
    "created_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": "1234567891",
    "text": "comentario 2",
    "created_at": "2024-01-15T10:35:00Z"
  }
]
```

### 3. Frontend - UI actualizada
**Archivo**: `components/conversation-details.tsx`

#### Nueva interfaz:
- Cada comentario se muestra como una tarjeta individual
- Botones de editar (✏️) y eliminar (🗑️) en cada comentario
- Editor inline para editar comentarios
- Timestamp legible para cada comentario (ej: "15 ene 10:30")

#### Estados de la UI:
- Textarea deshabilitada mientras se edita un comentario
- Botones de agregar comentario deshabilitados en modo edición
- Indicadores de carga durante operaciones

### 4. Validaciones
- No permite guardar comentarios vacíos
- Validación de ID de comentario al editar/eliminar
- Manejo de errores con logs en consola
- Fallback a array vacío si el JSON es inválido

## Instalación / Migración

### Paso 1: Ejecutar migración en la base de datos
```sql
-- Ejecutar el script de migración en Railway PostgreSQL
-- Archivo: scripts/009_migrate_comments_to_json.sql

-- Este script:
-- - Convierte comentarios existentes de texto a formato JSON
-- - Convierte comentarios NULL en arrays vacíos
-- - Mantiene la fecha de creación del comentario original
```

### Paso 2: Desplegar cambios
```bash
git pull origin main
pnpm install  # si hay nuevas dependencias
pnpm build
pnpm start
```

## Cambios API

### POST /api/conversations/[id]/comments
**Igual que antes**, ahora retorna array JSON:
```javascript
{
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ comment: "nuevo comentario" })
}
// Respuesta:
{
  id: "123",
  comments: [/* array de comentarios */],
  message: "Comment added successfully"
}
```

### PUT /api/conversations/[id]/comments
**Nuevo**: Actualizar un comentario existente
```javascript
{
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ 
    commentId: "1234567890",
    text: "texto actualizado"
  })
}
// Respuesta:
{
  id: "123",
  comments: [/* array actualizado */],
  message: "Comment updated successfully"
}
```

### DELETE /api/conversations/[id]/comments
**Nuevo**: Eliminar un comentario específico
```javascript
{
  method: "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ 
    commentId: "1234567890"
  })
}
// Respuesta:
{
  id: "123",
  comments: [/* array sin el comentario eliminado */],
  message: "Comment deleted successfully"
}
```

## Compatibilidad

✅ **Compatible hacia atrás**: Si hay comentarios en formato antiguo (texto), se convierten automáticamente a JSON en la migración.

⚠️ **Importante**: El servidor ahora espera JSON para los comentarios. Después de la migración, todos los comentarios estarán en formato JSON.

## Pruebas Locales

1. Agregar un comentario nuevo → se guarda como JSON
2. Editar el comentario → se actualiza correctamente
3. Eliminar el comentario → desaparece de la lista
4. Refrescar la página → los cambios persisten

## Rollback (si es necesario)

Si necesitas revertir:
```bash
git revert <commit-id>
```

Pero recuerda que la base de datos habrá sido modificada por la migración.

## Notas Técnicas

- Los IDs de comentarios son timestamps en milisegundos
- Los comentarios se ordenan por el orden del array JSON
- Cada operación (POST/PUT/DELETE) actualiza el timestamp `updated_at` de la conversación
- No hay límite de comentarios por conversación (aunque se recomienda limitar el tamaño de la columna)

## Próximos Pasos (Opcionales)

- [ ] Agregar filtrado de comentarios por usuario
- [ ] Agregar @ mentions en comentarios
- [ ] Agregar reacciones emoji a comentarios
- [ ] Implementar historial de ediciones de comentarios
