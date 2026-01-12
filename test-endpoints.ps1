# Script de testing para validar endpoints API (Windows)
# Uso: ./test-endpoints.ps1

$BaseUrl = "http://localhost:3000"
$Token = ""
$ContactId = ""
$ConversationId = ""

Write-Host "=== Testing Internal Chat MVP API ===" -ForegroundColor Cyan
Write-Host ""

# ============================================
# FUNCIÓN PARA HACER REQUESTS
# ============================================
function Make-Request {
  param(
    [string]$Method,
    [string]$Endpoint,
    [string]$Data,
    [bool]$WithToken = $false
  )

  Write-Host "→ $Method $Endpoint" -ForegroundColor Yellow

  $Headers = @{
    "Content-Type" = "application/json"
  }

  if ($WithToken -and -not [string]::IsNullOrEmpty($Token)) {
    $Headers["Authorization"] = "Bearer $Token"
  }

  try {
    if ([string]::IsNullOrEmpty($Data)) {
      $response = Invoke-RestMethod -Uri "$BaseUrl$Endpoint" `
        -Method $Method `
        -Headers $Headers
    } else {
      $response = Invoke-RestMethod -Uri "$BaseUrl$Endpoint" `
        -Method $Method `
        -Headers $Headers `
        -Body $Data
    }

    Write-Host ($response | ConvertTo-Json -Depth 10)
  } catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  }

  Write-Host ""
}

# ============================================
# TEST 1: SIGNUP
# ============================================
Write-Host "TEST 1: SIGNUP" -ForegroundColor Cyan
Write-Host ""

$Timestamp = [int][double]::Parse((Get-Date -UFormat %s))
$Email = "agent_test_$Timestamp@example.com"
$Password = "TestPassword123"

$SignupData = @{
  email  = $Email
  password = $Password
  name   = "Test Agent"
} | ConvertTo-Json

try {
  $response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/signup" `
    -Method POST `
    -ContentType "application/json" `
    -Body $SignupData

  Write-Host ($response | ConvertTo-Json -Depth 10)

  if ($response.access_token) {
    $Token = $response.access_token
    Write-Host "✓ Signup successful" -ForegroundColor Green
    Write-Host "✓ Token obtained" -ForegroundColor Green
  } else {
    Write-Host "✗ Failed to get token" -ForegroundColor Red
    exit 1
  }
} catch {
  Write-Host "✗ Signup failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

Write-Host ""

# ============================================
# TEST 2: LOGIN
# ============================================
Write-Host "TEST 2: LOGIN" -ForegroundColor Cyan
Write-Host ""

$LoginData = @{
  email    = $Email
  password = $Password
} | ConvertTo-Json

try {
  $response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $LoginData

  Write-Host ($response | ConvertTo-Json -Depth 10)

  if ($response.access_token) {
    $Token = $response.access_token
    Write-Host "✓ Login successful" -ForegroundColor Green
  } else {
    Write-Host "✗ Login failed" -ForegroundColor Red
  }
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================
# TEST 3: CREATE CONTACT
# ============================================
Write-Host "TEST 3: CREATE CONTACT" -ForegroundColor Cyan
Write-Host ""

$ContactData = @{
  phone_number = "+1234567890"
  name         = "Test Client"
} | ConvertTo-Json

$Headers = @{
  "Content-Type"  = "application/json"
  "Authorization" = "Bearer $Token"
}

try {
  $response = Invoke-RestMethod -Uri "$BaseUrl/api/contacts" `
    -Method POST `
    -Headers $Headers `
    -Body $ContactData

  Write-Host ($response | ConvertTo-Json -Depth 10)

  if ($response.id) {
    $ContactId = $response.id
    Write-Host "✓ Contact created (ID: $ContactId)" -ForegroundColor Green
  } else {
    Write-Host "⚠ Failed to create contact" -ForegroundColor Yellow
  }
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================
# TEST 4: LIST CONTACTS
# ============================================
Write-Host "TEST 4: LIST CONTACTS" -ForegroundColor Cyan
Write-Host ""

try {
  $response = Invoke-RestMethod -Uri "$BaseUrl/api/contacts" `
    -Method GET `
    -Headers $Headers

  Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================
# TEST 5: CREATE CONVERSATION
# ============================================
Write-Host "TEST 5: CREATE CONVERSATION" -ForegroundColor Cyan
Write-Host ""

if (-not [string]::IsNullOrEmpty($ContactId)) {
  $ConvData = @{
    contact_id       = [int]$ContactId
    assigned_agent_id = 1
    status           = "open"
  } | ConvertTo-Json

  try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/conversations" `
      -Method POST `
      -Headers $Headers `
      -Body $ConvData

    Write-Host ($response | ConvertTo-Json -Depth 10)

    if ($response.id) {
      $ConversationId = $response.id
      Write-Host "✓ Conversation created (ID: $ConversationId)" -ForegroundColor Green
    }
  } catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  }
} else {
  Write-Host "⚠ Skipping conversation creation (no contact)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# TEST 6: SEND MESSAGE
# ============================================
Write-Host "TEST 6: SEND MESSAGE" -ForegroundColor Cyan
Write-Host ""

if (-not [string]::IsNullOrEmpty($ConversationId)) {
  $MessageData = @{
    content      = "Hello from test!"
    message_type = "text"
  } | ConvertTo-Json

  try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/conversations/$ConversationId/messages" `
      -Method POST `
      -Headers $Headers `
      -Body $MessageData

    Write-Host ($response | ConvertTo-Json -Depth 10)

    if ($response.id) {
      Write-Host "✓ Message sent" -ForegroundColor Green
    }
  } catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  }
} else {
  Write-Host "⚠ Skipping message test (no conversation)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# TEST 7: LIST CONVERSATIONS
# ============================================
Write-Host "TEST 7: LIST CONVERSATIONS" -ForegroundColor Cyan
Write-Host ""

try {
  $response = Invoke-RestMethod -Uri "$BaseUrl/api/conversations" `
    -Method GET `
    -Headers $Headers

  Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================
# TEST 8: CREATE MACRO
# ============================================
Write-Host "TEST 8: CREATE MACRO" -ForegroundColor Cyan
Write-Host ""

$MacroData = @{
  title    = "Greeting"
  content  = "Hello! How can I help?"
  shortcut = "/hello"
} | ConvertTo-Json

try {
  $response = Invoke-RestMethod -Uri "$BaseUrl/api/macros" `
    -Method POST `
    -Headers $Headers `
    -Body $MacroData

  Write-Host ($response | ConvertTo-Json -Depth 10)

  if ($response.id) {
    Write-Host "✓ Macro created (ID: $($response.id))" -ForegroundColor Green
  }
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================
# TEST 9: LIST MACROS
# ============================================
Write-Host "TEST 9: LIST MACROS" -ForegroundColor Cyan
Write-Host ""

try {
  $response = Invoke-RestMethod -Uri "$BaseUrl/api/macros" `
    -Method GET `
    -Headers $Headers

  Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================
# TEST 10: CREATE ORDER
# ============================================
Write-Host "TEST 10: CREATE ORDER" -ForegroundColor Cyan
Write-Host ""

if (-not [string]::IsNullOrEmpty($ContactId)) {
  $OrderData = @{
    order_number = "ORD-001"
    contact_id   = [int]$ContactId
    status       = "pending"
    total_amount = 100.00
  } | ConvertTo-Json

  try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/orders" `
      -Method POST `
      -Headers $Headers `
      -Body $OrderData

    Write-Host ($response | ConvertTo-Json -Depth 10)

    if ($response.id) {
      Write-Host "✓ Order created (ID: $($response.id))" -ForegroundColor Green
    }
  } catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  }
} else {
  Write-Host "⚠ Skipping order creation (no contact)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# SUMMARY
# ============================================
Write-Host "=== Testing Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Credentials for future testing:" -ForegroundColor Green
Write-Host "Email: $Email"
Write-Host "Password: $Password"
Write-Host ""
Write-Host "Note: Keep these credentials for testing" -ForegroundColor Yellow
