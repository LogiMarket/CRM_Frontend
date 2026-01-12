#!/bin/bash

# Script de testing para validar endpoints API
# Uso: ./test-endpoints.sh

BASE_URL="http://localhost:3000"
TOKEN=""
CONTACT_ID=""
CONVERSATION_ID=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Testing Internal Chat MVP API ===${NC}\n"

# ============================================
# FUNCIÓN PARA HACER REQUESTS
# ============================================
make_request() {
  local method=$1
  local endpoint=$2
  local data=$3
  local with_token=$4

  echo -e "${YELLOW}→ $method $endpoint${NC}"

  if [ -z "$data" ]; then
    if [ "$with_token" = "true" ] && [ -n "$TOKEN" ]; then
      curl -s -X "$method" "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null || echo "Error parsing JSON"
    else
      curl -s -X "$method" "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" | jq . 2>/dev/null || echo "Error parsing JSON"
    fi
  else
    if [ "$with_token" = "true" ] && [ -n "$TOKEN" ]; then
      curl -s -X "$method" "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$data" | jq . 2>/dev/null || echo "Error parsing JSON"
    else
      curl -s -X "$method" "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data" | jq . 2>/dev/null || echo "Error parsing JSON"
    fi
  fi

  echo ""
}

# ============================================
# TEST 1: SIGNUP
# ============================================
echo -e "${BLUE}TEST 1: SIGNUP${NC}\n"

TIMESTAMP=$(date +%s)
EMAIL="agent_test_$TIMESTAMP@example.com"
PASSWORD="TestPassword123"

response=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\", \"name\": \"Test Agent\"}")

echo "$response" | jq . 2>/dev/null || echo "$response"

TOKEN=$(echo "$response" | jq -r '.access_token // empty')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Failed to get token${NC}\n"
  exit 1
fi

echo -e "${GREEN}✓ Signup successful${NC}"
echo -e "${GREEN}✓ Token obtained${NC}\n"

# ============================================
# TEST 2: LOGIN
# ============================================
echo -e "${BLUE}TEST 2: LOGIN${NC}\n"

response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

echo "$response" | jq . 2>/dev/null || echo "$response"

NEW_TOKEN=$(echo "$response" | jq -r '.access_token // empty')

if [ -n "$NEW_TOKEN" ]; then
  echo -e "${GREEN}✓ Login successful${NC}\n"
  TOKEN="$NEW_TOKEN"
else
  echo -e "${RED}✗ Login failed${NC}\n"
fi

# ============================================
# TEST 3: CREATE CONTACT
# ============================================
echo -e "${BLUE}TEST 3: CREATE CONTACT${NC}\n"

response=$(curl -s -X POST "$BASE_URL/api/contacts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"phone_number\": \"+1234567890\", \"name\": \"Test Client\"}")

echo "$response" | jq . 2>/dev/null || echo "$response"

CONTACT_ID=$(echo "$response" | jq -r '.id // empty')

if [ -n "$CONTACT_ID" ]; then
  echo -e "${GREEN}✓ Contact created (ID: $CONTACT_ID)${NC}\n"
else
  echo -e "${YELLOW}⚠ Failed to create contact${NC}\n"
fi

# ============================================
# TEST 4: LIST CONTACTS
# ============================================
echo -e "${BLUE}TEST 4: LIST CONTACTS${NC}\n"

make_request "GET" "/api/contacts" "" "true"

# ============================================
# TEST 5: CREATE CONVERSATION
# ============================================
echo -e "${BLUE}TEST 5: CREATE CONVERSATION${NC}\n"

if [ -n "$CONTACT_ID" ]; then
  response=$(curl -s -X POST "$BASE_URL/api/conversations" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"contact_id\": $CONTACT_ID, \"assigned_agent_id\": 1, \"status\": \"open\"}")

  echo "$response" | jq . 2>/dev/null || echo "$response"

  CONVERSATION_ID=$(echo "$response" | jq -r '.id // empty')

  if [ -n "$CONVERSATION_ID" ]; then
    echo -e "${GREEN}✓ Conversation created (ID: $CONVERSATION_ID)${NC}\n"
  fi
else
  echo -e "${YELLOW}⚠ Skipping conversation creation (no contact)${NC}\n"
fi

# ============================================
# TEST 6: SEND MESSAGE
# ============================================
echo -e "${BLUE}TEST 6: SEND MESSAGE${NC}\n"

if [ -n "$CONVERSATION_ID" ]; then
  response=$(curl -s -X POST "$BASE_URL/api/conversations/$CONVERSATION_ID/messages" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"content\": \"Hello from test!\", \"message_type\": \"text\"}")

  echo "$response" | jq . 2>/dev/null || echo "$response"

  MESSAGE_ID=$(echo "$response" | jq -r '.id // empty')

  if [ -n "$MESSAGE_ID" ]; then
    echo -e "${GREEN}✓ Message sent${NC}\n"
  fi
else
  echo -e "${YELLOW}⚠ Skipping message test (no conversation)${NC}\n"
fi

# ============================================
# TEST 7: LIST CONVERSATIONS
# ============================================
echo -e "${BLUE}TEST 7: LIST CONVERSATIONS${NC}\n"

make_request "GET" "/api/conversations" "" "true"

# ============================================
# TEST 8: CREATE MACRO
# ============================================
echo -e "${BLUE}TEST 8: CREATE MACRO${NC}\n"

response=$(curl -s -X POST "$BASE_URL/api/macros" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"title\": \"Greeting\", \"content\": \"Hello! How can I help?\", \"shortcut\": \"/hello\"}")

echo "$response" | jq . 2>/dev/null || echo "$response"

MACRO_ID=$(echo "$response" | jq -r '.id // empty')

if [ -n "$MACRO_ID" ]; then
  echo -e "${GREEN}✓ Macro created (ID: $MACRO_ID)${NC}\n"
fi

# ============================================
# TEST 9: LIST MACROS
# ============================================
echo -e "${BLUE}TEST 9: LIST MACROS${NC}\n"

make_request "GET" "/api/macros" "" "true"

# ============================================
# TEST 10: CREATE ORDER
# ============================================
echo -e "${BLUE}TEST 10: CREATE ORDER${NC}\n"

if [ -n "$CONTACT_ID" ]; then
  response=$(curl -s -X POST "$BASE_URL/api/orders" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"order_number\": \"ORD-001\", \"contact_id\": $CONTACT_ID, \"status\": \"pending\", \"total_amount\": 100.00}")

  echo "$response" | jq . 2>/dev/null || echo "$response"

  ORDER_ID=$(echo "$response" | jq -r '.id // empty')

  if [ -n "$ORDER_ID" ]; then
    echo -e "${GREEN}✓ Order created (ID: $ORDER_ID)${NC}\n"
  fi
else
  echo -e "${YELLOW}⚠ Skipping order creation (no contact)${NC}\n"
fi

# ============================================
# SUMMARY
# ============================================
echo -e "${BLUE}=== Testing Complete ===${NC}\n"

echo -e "${GREEN}Credentials for future testing:${NC}"
echo "Email: $EMAIL"
echo "Password: $PASSWORD"
echo ""
echo -e "${YELLOW}Note: Keep these credentials for testing${NC}"
