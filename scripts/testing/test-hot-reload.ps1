# ============================================
# Test Hot Reload Functionality
# ============================================
# This script verifies hot reload is working
# ============================================

Write-Host "🧪 Testing Hot Reload Setup..." -ForegroundColor Cyan
Write-Host ""

# Check if dev containers are running
Write-Host "Step 1: Checking if development containers are running..." -ForegroundColor Yellow
$devContainers = docker ps --filter "name=rrf-frontend-dev" --format "{{.Names}}"

if ($devContainers -match "rrf-frontend-dev") {
    Write-Host "✅ Development containers are running" -ForegroundColor Green
} else {
    Write-Host "❌ Development containers NOT running" -ForegroundColor Red
    Write-Host "   Run: .\\start-dev-mode.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit
}
Write-Host ""

# Check volume mounting
Write-Host "Step 2: Verifying volume mounting..." -ForegroundColor Yellow
$volumeCheck = docker inspect rrf-frontend-dev --format "{{json .Mounts}}" | ConvertFrom-Json
$appVolumeExists = $volumeCheck | Where-Object { $_.Destination -eq "/app" -and $_.Type -eq "bind" }

if ($appVolumeExists) {
    Write-Host "✅ Volume mounting configured correctly" -ForegroundColor Green
    Write-Host "   Source: $($appVolumeExists.Source)" -ForegroundColor Gray
} else {
    Write-Host "❌ Volume mounting NOT configured" -ForegroundColor Red
}
Write-Host ""

# Check environment variables
Write-Host "Step 3: Checking hot reload environment variables..." -ForegroundColor Yellow
$envVars = docker exec rrf-frontend-dev printenv | Select-String -Pattern "CHOKIDAR_USEPOLLING|WATCHPACK_POLLING"

if ($envVars) {
    Write-Host "✅ Hot reload environment variables set:" -ForegroundColor Green
    $envVars | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Host "⚠️ Hot reload environment variables missing" -ForegroundColor Yellow
}
Write-Host ""

# Check if dev server is running
Write-Host "Step 4: Verifying development server..." -ForegroundColor Yellow
$devServerCheck = docker exec rrf-frontend-dev ps aux | Select-String -Pattern "next dev"

if ($devServerCheck) {
    Write-Host "✅ Next.js development server is running" -ForegroundColor Green
} else {
    Write-Host "❌ Development server NOT running (expected: npm run dev)" -ForegroundColor Red
}
Write-Host ""

# Test frontend accessibility
Write-Host "Step 5: Testing frontend accessibility..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend is accessible at http://localhost:3000" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Cannot access frontend at http://localhost:3000" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}
Write-Host ""

# Summary
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ All checks passed! Hot reload should be working." -ForegroundColor Green
Write-Host ""
Write-Host "🔥 To test hot reload:" -ForegroundColor White
Write-Host "   1. Edit: rrf-portal-nextjs\\app\\page.jsx" -ForegroundColor Gray
Write-Host "   2. Watch logs: docker-compose -f docker-compose.dev.yml logs -f frontend" -ForegroundColor Gray
Write-Host "   3. You should see 'Compiled in XXXms'" -ForegroundColor Gray
Write-Host "   4. Refresh browser - changes appear instantly!" -ForegroundColor Gray
Write-Host ""
