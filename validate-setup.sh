#!/bin/bash

# Script para validar la configuración del proyecto
echo "🔍 Validando configuración de Internal Chat MVP..."
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi
echo "✅ Node.js: $(node --version)"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado"
    exit 1
fi
echo "✅ npm: $(npm --version)"

# Verificar .env.local
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local no existe"
    echo "   Creando desde .env.example..."
    cp .env.example .env.local
    echo "   ✅ Archivo creado. Edita los valores en .env.local"
else
    echo "✅ .env.local existe"
fi

# Verificar node_modules
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules no existe"
    echo "   Instalando dependencias..."
    npm install
else
    echo "✅ node_modules existe"
fi

# Verificar PostgreSQL
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL client está instalado"
    
    # Tratar de conectar a la base de datos
    if psql -U postgres -d internal_chat_mvp -c "\dt" 2>/dev/null | grep -q "users"; then
        echo "✅ Base de datos existe y tiene tabla 'users'"
    else
        echo "⚠️  Base de datos no tiene tabla 'users'"
        echo "   Ejecuta: psql -U postgres -d internal_chat_mvp -f scripts/001_initial_schema.sql"
    fi
else
    echo "⚠️  PostgreSQL client no está instalado"
    echo "   Verifica que PostgreSQL está corriendo en el servidor"
fi

echo ""
echo "✅ Validación completada!"
echo ""
echo "Próximos pasos:"
echo "1. Editar .env.local con los valores correctos"
echo "2. Asegurar que PostgreSQL está corriendo"
echo "3. Ejecutar: npm run dev"
