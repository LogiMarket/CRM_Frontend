#!/bin/bash

# Script de validación para verificar que los endpoints funcionan correctamente

BASE_URL="http://localhost:3000"
BACKEND_URL="https://crmbackend-production-4e4d.up.railway.app"

echo "======================================"
echo "Validación de Endpoints de API"
echo "======================================"
echo ""

# Test 1: Verificar que /api/conversations responde
echo "✓ Test 1: Verificando /api/conversations"
curl -s -X GET "$BASE_URL/api/conversations" \
  -H "Cookie: session_token=test" \
  -w "\nStatus: %{http_code}\n" | head -20
echo ""

# Test 2: Verificar que /api/users/agents responde
echo "✓ Test 2: Verificando /api/users/agents"
curl -s -X GET "$BASE_URL/api/users/agents" \
  -H "Cookie: session_token=test" \
  -w "\nStatus: %{http_code}\n" | head -20
echo ""

# Test 3: Verificar que el backend está disponible
echo "✓ Test 3: Verificando backend NestJS"
curl -s -X GET "$BACKEND_URL/api/users/agents" \
  -H "Authorization: Bearer test" \
  -w "\nStatus: %{http_code}\n" | head -20
echo ""

echo "======================================"
echo "Validación Completada"
echo "======================================"
