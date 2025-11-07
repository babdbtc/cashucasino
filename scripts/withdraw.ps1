# PowerShell script to withdraw funds from house wallet
# Usage: .\scripts\withdraw.ps1 -Amount 10000 [-Local]

param(
    [Parameter(Mandatory=$true)]
    [int]$Amount,

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

Write-Host "Withdrawing $Amount sats from house wallet..." -ForegroundColor Cyan
Write-Host ""

try {
    $headers = @{
        "Authorization" = "Bearer $env:ADMIN_API_KEY"
        "Content-Type" = "application/json"
    }

    $body = @{
        amount = $Amount
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$apiUrl/api/admin/withdraw" -Method Post -Headers $headers -Body $body

    Write-Host "Message: $($response.message)" -ForegroundColor Green
    Write-Host "Amount: $($response.amount) sats"
    Write-Host "New Balance: $($response.newBalance) sats"
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "✅ WITHDRAWAL SUCCESSFUL!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Your Cashu token:" -ForegroundColor Cyan
    Write-Host $response.token -ForegroundColor White
    Write-Host ""
    Write-Host "Copy this token and paste it into your Cashu wallet to receive the funds!" -ForegroundColor Yellow
    Write-Host ""

    # Copy to clipboard if available
    if (Get-Command Set-Clipboard -ErrorAction SilentlyContinue) {
        $response.token | Set-Clipboard
        Write-Host "Token copied to clipboard! ✓" -ForegroundColor Green
    }

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Details: $($errorObj.error)" -ForegroundColor Red
    }

    exit 1
}
