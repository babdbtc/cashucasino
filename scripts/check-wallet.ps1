# PowerShell script to check house wallet balance
# Usage: .\scripts\check-wallet.ps1 [-Local]

param(
    [switch]$Local
)

# Load environment variables
if (Test-Path .env.local) {
    Get-Content .env.local | ForEach-Object {
        if ($_ -match 'ADMIN_API_KEY=(.+)') {
            $env:ADMIN_API_KEY = $matches[1]
        }
    }
}

if (-not $env:ADMIN_API_KEY) {
    Write-Host "Error: ADMIN_API_KEY not set in .env.local" -ForegroundColor Red
    exit 1
}

# Set API URL
if ($Local) {
    $apiUrl = "http://localhost:3000"
} else {
    $apiUrl = "https://gamble.babd.space"
}

Write-Host "Checking house wallet balance..." -ForegroundColor Cyan
Write-Host ""

try {
    $headers = @{
        "Authorization" = "Bearer $env:ADMIN_API_KEY"
    }

    $response = Invoke-RestMethod -Uri "$apiUrl/api/admin/wallet" -Headers $headers -Method Get

    Write-Host "Balance: $($response.balance) sats" -ForegroundColor Green
    Write-Host "Proof Count: $($response.proofCount)"
    Write-Host "Last Updated: $($response.lastUpdated)"
    Write-Host "Status: $($response.status)"

} catch {
    Write-Host "Error: Failed to connect to API" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
