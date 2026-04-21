# ============================================
# Switch Back to Production Mode
# ============================================
# This script safely stops development containers
# and restarts production containers
# ⚠️ NO DATA LOSS - Database volume is preserved
# ============================================

Write-Host "🏭 Switching to Production Mode..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop development containers (keeps volumes/data)
Write-Host "Step 1/3: Stopping development containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml down
Write-Host "✅ Development containers stopped (data preserved)" -ForegroundColor Green
Write-Host ""

# Step 2: Verify database volume
Write-Host "Step 2/3: Verifying database volume..." -ForegroundColor Yellow
$volumeExists = docker volume ls --format "{{.Name}}" | Select-String -Pattern "postgres_data"
if ($volumeExists) {
    Write-Host "✅ Database volume 'postgres_data' found - your data is safe!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Warning: Database volume not found." -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Start production containers
Write-Host "Step 3/3: Starting production containers..." -ForegroundColor Yellow
docker-compose up -d --build
Write-Host ""

# Wait for containers
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Check status
Write-Host ""
Write-Host "=== Container Status ===" -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "✅ Successfully switched to PRODUCTION MODE!" -ForegroundColor Green
Write-Host ""
Write-Host "Access your application:" -ForegroundColor White
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:4000" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Note: Hot reload is disabled in production mode" -ForegroundColor Gray
Write-Host "   To enable hot reload again, run: .\\start-dev-mode.ps1" -ForegroundColor Gray
Write-Host ""
