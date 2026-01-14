-- Migration 006: Cambiar status de ENUM a VARCHAR y agregar comments si no existe

-- Primero, agregar columna comments si no existe
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS comments TEXT DEFAULT NULL;

-- Cambiar status de ENUM a VARCHAR para evitar problemas de compatibilidad
-- Primero crear una columna temporal
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status_temp VARCHAR(50);

-- Copiar valores actuales (convertir cualquier valor a VARCHAR)
UPDATE conversations SET status_temp = CAST(status AS VARCHAR);

-- Eliminar la columna antigua
ALTER TABLE conversations DROP COLUMN IF EXISTS status CASCADE;

-- Renombrar la temporal
ALTER TABLE conversations RENAME COLUMN status_temp TO status;

-- Establecer valor por defecto
ALTER TABLE conversations ALTER COLUMN status SET DEFAULT 'open';

-- Hacer NOT NULL si es necesario (primero actualizar NULLs)
UPDATE conversations SET status = 'open' WHERE status IS NULL;
ALTER TABLE conversations ALTER COLUMN status SET NOT NULL;

-- Verificar
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'conversations' AND column_name IN ('status', 'comments');
