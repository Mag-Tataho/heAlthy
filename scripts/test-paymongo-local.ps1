param(
  [string]$BaseUrl = 'http://localhost:5000',
  [string]$BackendEnvPath = '',
  [string]$FreeEmail = 'free@test.com',
  [string]$FreePassword = 'password123',
  [string]$PremiumEmail = 'premium@test.com',
  [string]$PremiumPassword = 'password123',
  [string]$AdminEmail = '',
  [string]$AdminPassword = '',
  [ValidateSet('SourceChargeable', 'PaymentPaid')]
  [string]$WebhookMode = 'SourceChargeable',
  [int]$AmountPhp = 49
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
if (-not $BackendEnvPath) {
  $BackendEnvPath = Join-Path $RepoRoot 'backend\.env'
}

function Get-DotEnvValue {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Name
  )

  if (-not (Test-Path $Path)) {
    return $null
  }

  $line = Get-Content $Path | Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  $value = $line -replace "^\s*$([regex]::Escape($Name))\s*=\s*", ''
  return $value.Trim().Trim('"')
}

function Write-Step {
  param([Parameter(Mandatory = $true)][string]$Text)
  Write-Host "`n== $Text ==" -ForegroundColor Cyan
}

function New-PaymongoSignature {
  param(
    [Parameter(Mandatory = $true)][string]$Secret,
    [Parameter(Mandatory = $true)][string]$Body,
    [Parameter(Mandatory = $true)][string]$Timestamp,
    [switch]$Live
  )

  $keyBytes = [System.Text.Encoding]::UTF8.GetBytes($Secret)
  $hmac = [System.Security.Cryptography.HMACSHA256]::new($keyBytes)
  try {
    $hashBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes("$Timestamp.$Body"))
    $signature = ($hashBytes | ForEach-Object { $_.ToString('x2') }) -join ''
  } finally {
    $hmac.Dispose()
  }

  if ($Live) {
    return "t=$Timestamp,li=$signature"
  }

  return "t=$Timestamp,te=$signature"
}

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('GET', 'POST', 'PUT', 'DELETE')][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [hashtable]$Headers = @{},
    $Body = $null
  )

  $uri = "$BaseUrl$Path"
  $invokeParams = @{
    Method      = $Method
    Uri         = $uri
    Headers     = $Headers
    ErrorAction = 'Stop'
  }

  if ($null -ne $Body) {
    $invokeParams.ContentType = 'application/json'
    $invokeParams.Body = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Depth 12 -Compress }
  }

  return Invoke-RestMethod @invokeParams
}

function Invoke-WebhookRequest {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Body,
    [Parameter(Mandatory = $true)][hashtable]$Headers
  )

  $uri = "$BaseUrl$Path"
  return Invoke-RestMethod -Method POST -Uri $uri -Headers $Headers -ContentType 'application/json' -Body $Body -ErrorAction Stop
}

function Get-TestToken {
  param(
    [Parameter(Mandatory = $true)][string]$Email,
    [Parameter(Mandatory = $true)][string]$Password
  )

  $login = Invoke-JsonRequest -Method POST -Path '/api/auth/login' -Body @{ email = $Email; password = $Password }
  if (-not $login.token) {
    throw "Login failed for $Email"
  }

  return [pscustomobject]@{
    token = $login.token
    user  = $login.user
  }
}

$WebhookSecret = $env:PAYMONGO_WEBHOOK_SECRET
if (-not $WebhookSecret) {
  $WebhookSecret = Get-DotEnvValue -Path $BackendEnvPath -Name 'PAYMONGO_WEBHOOK_SECRET'
}

$AdminSecret = $env:ADMIN_SECRET
if (-not $AdminSecret) {
  $AdminSecret = Get-DotEnvValue -Path $BackendEnvPath -Name 'ADMIN_SECRET'
}

if (-not $WebhookSecret) {
  throw 'PAYMONGO_WEBHOOK_SECRET is missing. Add it to backend/.env before testing the webhook.'
}

Write-Step '0) Check backend health'
$health = Invoke-JsonRequest -Method GET -Path '/api/health'
Write-Host "Backend: $($health.status) / $($health.app)"

Write-Step '1) Log in with the test users'
$free = Get-TestToken -Email $FreeEmail -Password $FreePassword
$premium = Get-TestToken -Email $PremiumEmail -Password $PremiumPassword

$freeToken = $free.token
$premiumToken = $premium.token
$freeUserId = [string]$free.user._id

Write-Host "Free user:    $FreeEmail ($freeUserId)"
Write-Host ("Premium user: {0} ({1})" -f $PremiumEmail, [string]$premium.user._id)

Write-Step '2) Verify /api/auth/me'
$freeMe = Invoke-JsonRequest -Method GET -Path '/api/auth/me' -Headers @{ Authorization = "Bearer $freeToken" }
$premiumMe = Invoke-JsonRequest -Method GET -Path '/api/auth/me' -Headers @{ Authorization = "Bearer $premiumToken" }
Write-Host "Free user premium flag:    $($freeMe.user.isPremium)"
Write-Host "Premium user premium flag: $($premiumMe.user.isPremium)"

Write-Step '3) Verify requirePremium blocks free users and allows premium users'
try {
  Invoke-JsonRequest -Method GET -Path '/api/reports/advanced' -Headers @{ Authorization = "Bearer $freeToken" } | Out-Null
  throw 'Expected the free user to be blocked, but the request succeeded.'
} catch {
  $statusCode = $null
  if ($_.Exception.Response) {
    $statusCode = [int]$_.Exception.Response.StatusCode
  }

  if ($statusCode -ne 403) {
    throw
  }

  Write-Host 'Free user blocked correctly with 403.'
}

$advanced = Invoke-JsonRequest -Method GET -Path '/api/reports/advanced' -Headers @{ Authorization = "Bearer $premiumToken" }
Write-Host "Premium user allowed. Report status: $($advanced.status)"

Write-Step '4) Optional admin manual upgrade test'
if ($AdminEmail -and $AdminPassword) {
  if (-not $AdminSecret) {
    throw 'ADMIN_SECRET is missing. Add it to backend/.env before testing the admin endpoint.'
  }

  $admin = Get-TestToken -Email $AdminEmail -Password $AdminPassword
  $adminUpgrade = Invoke-JsonRequest -Method POST -Path '/api/admin/upgrade-user' -Headers @{ ADMIN_SECRET = $AdminSecret } -Body @{ userId = [string]$admin.user._id }
  Write-Host "Admin upgrade returned isPremium=$($adminUpgrade.isPremium) for $AdminEmail"
} else {
  Write-Host 'Skipped. Provide -AdminEmail and -AdminPassword to test POST /api/admin/upgrade-user.'
}

Write-Step '5) Create a PayMongo QRPH source'
$source = Invoke-JsonRequest -Method POST -Path '/api/payments/create-qrph-source' -Headers @{ Authorization = "Bearer $freeToken" } -Body @{ amount = $AmountPhp; userId = $freeUserId }

$sourceId = [string]$source.id
$checkoutUrl = $null
if ($source.attributes.redirect.checkout_url) {
  $checkoutUrl = [string]$source.attributes.redirect.checkout_url
} elseif ($source.attributes.checkout_url) {
  $checkoutUrl = [string]$source.attributes.checkout_url
}

Write-Host "Source ID: $sourceId"
Write-Host "Checkout URL: $checkoutUrl"

Write-Step "6) Send a simulated $WebhookMode webhook"
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()

if ($WebhookMode -eq 'SourceChargeable') {
  $webhookPayload = [ordered]@{
    data = [ordered]@{
      attributes = [ordered]@{
        type = 'source.chargeable'
        livemode = $false
        data = [ordered]@{
          id = $sourceId
        }
      }
    }
  }
} else {
  $webhookPayload = [ordered]@{
    data = [ordered]@{
      attributes = [ordered]@{
        type = 'payment.paid'
        livemode = $false
        data = [ordered]@{
          id = "pi_test_$sourceId"
          attributes = [ordered]@{
            source = [ordered]@{
              id = $sourceId
            }
          }
        }
      }
    }
  }
}

$webhookBody = $webhookPayload | ConvertTo-Json -Depth 12 -Compress
$webhookSignature = New-PaymongoSignature -Secret $WebhookSecret -Body $webhookBody -Timestamp $timestamp

try {
  $webhookResponse = Invoke-WebhookRequest -Path '/api/payments/webhook' -Headers @{ 'Paymongo-Signature' = $webhookSignature } -Body $webhookBody
  Write-Host "Webhook response: $($webhookResponse.message)"
} catch {
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseText = $reader.ReadToEnd()
    $reader.Close()
    Write-Host "Webhook failed with response: $responseText" -ForegroundColor Red
  }

  throw
}

Write-Step '7) Check payment status and premium state'
for ($attempt = 1; $attempt -le 6; $attempt += 1) {
  $paymentStatus = Invoke-JsonRequest -Method GET -Path "/api/payments/status/$sourceId" -Headers @{ Authorization = "Bearer $freeToken" }
  Write-Host (("Attempt {0}: status={1} isPremium={2}" -f $attempt, $paymentStatus.status, $paymentStatus.isPremium))

  if ($paymentStatus.status -eq 'paid' -and $paymentStatus.isPremium) {
    break
  }

  if ($attempt -lt 6) {
    Start-Sleep -Seconds 2
  }
}

$freeMeAfter = Invoke-JsonRequest -Method GET -Path '/api/auth/me' -Headers @{ Authorization = "Bearer $freeToken" }
Write-Host "Final /api/auth/me isPremium: $($freeMeAfter.user.isPremium)"

Write-Step '8) Final deploy check'
Write-Host 'Frontend build should pass with: cd frontend; npm run build'
Write-Host 'If you deploy to Vercel, point VITE_API_URL to the backend URL and set CLIENT_URL in backend/.env to the frontend URL.'
