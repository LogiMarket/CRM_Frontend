# Script para validar la configuración del proyecto en Windows
Write-Host "🔍 Validando configuración de Internal Chat MVP..." -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = & node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js no está instalado" -ForegroundColor Red
    exit 1
}

# Verificar npm
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmVersion = & npm --version
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm no está instalado" -ForegroundColor Red
    exit 1
}

# Verificar .env.local
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  .env.local no existe" -ForegroundColor Yellow
    Write-Host "   Creando desde .env.example..." -ForegroundColor Yellow
    
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.local"
        Write-Host "   ✅ Archivo creado. Edita los valores en .env.local" -ForegroundColor Green
    } else {
        Write-Host "   ❌ .env.example no existe" -ForegroundColor Red
    }
} else {
    Write-Host "✅ .env.local existe" -ForegroundColor Green
}

# Verificar node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules no existe" -ForegroundColor Yellow
    Write-Host "   Instalando dependencias..." -ForegroundColor Yellow
    & npm install
} else {
    Write-Host "✅ node_modules existe" -ForegroundColor Green
}

# Verificar PostgreSQL
if (Get-Command psql -ErrorAction SilentlyContinue) {
    Write-Host "✅ PostgreSQL client está instalado" -ForegroundColor Green
    
    # Tratar de conectar a la base de datos
    $tables = & psql -U postgres -d internal_chat_mvp -c "\dt" 2>$null
    if ($tables -match "users") {
        Write-Host "✅ Base de datos existe y tiene tabla 'users'" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Base de datos no tiene tabla 'users'" -ForegroundColor Yellow
        Write-Host "   Ejecuta: psql -U postgres -d internal_chat_mvp -f scripts/001_initial_schema.sql" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  PostgreSQL client no está instalado" -ForegroundColor Yellow
    Write-Host "   Verifica que PostgreSQL está corriendo en el servidor" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Validación completada!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Editar .env.local con los valores correctos"
Write-Host "2. Asegurar que PostgreSQL está corriendo"
Write-Host "3. Ejecutar: npm run dev"
