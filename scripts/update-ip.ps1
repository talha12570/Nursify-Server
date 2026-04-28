# PowerShell script to detect IP and update configs
Write-Host "🔍 Detecting local network IP address..." -ForegroundColor Cyan

# Get active IPv4 address (excluding loopback)
$ip = (Get-NetIPAddress -AddressFamily IPv4 | 
    Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" } | 
    Select-Object -First 1).IPAddress

if (-not $ip) {
    $ip = "localhost"
}

Write-Host "📡 Detected IP: $ip" -ForegroundColor Green

# Update .env file
$envPath = Join-Path $PSScriptRoot ".." ".env"
$serverIpLine = "SERVER_IP=$ip"

if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    if ($envContent -match "SERVER_IP=") {
        $envContent = $envContent -replace "SERVER_IP=.*", $serverIpLine
    } else {
        if (-not $envContent.EndsWith("`n")) {
            $envContent += "`n"
        }
        $envContent += "$serverIpLine`n"
    }
    Set-Content -Path $envPath -Value $envContent -NoNewline
    Write-Host "✓ Updated .env: SERVER_IP=$ip" -ForegroundColor Green
}

# Update App config
$appConfigPath = Join-Path $PSScriptRoot ".." ".." "App" "config" "api.js"
if (Test-Path $appConfigPath) {
    $content = Get-Content $appConfigPath -Raw
    $content = $content -replace "const SERVER_IP = '[^']*'", "const SERVER_IP = '$ip'"
    Set-Content -Path $appConfigPath -Value $content -NoNewline
    Write-Host "✓ Updated App/config/api.js: SERVER_IP=$ip" -ForegroundColor Green
}

# Update Admin Portal config
$adminConfigPath = Join-Path $PSScriptRoot ".." ".." "Admin Portal" "src" "config" "api.ts"
if (Test-Path $adminConfigPath) {
    $content = Get-Content $adminConfigPath -Raw
    $content = $content -replace "const SERVER_IP = '[^']*'", "const SERVER_IP = '$ip'"
    Set-Content -Path $adminConfigPath -Value $content -NoNewline
    Write-Host "✓ Updated Admin Portal/src/config/api.ts: SERVER_IP=$ip" -ForegroundColor Green
}

Write-Host "✅ All configurations updated successfully!" -ForegroundColor Green
Write-Host "`n🚀 Server will be available at: http://$($ip):5000" -ForegroundColor Cyan
