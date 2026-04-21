# ============================================
# Switch to Development Mode (Hot Reload)
# ============================================
# This script safely stops production containers
# and starts development containers with hot reload
# ⚠️ NO DATA LOSS - Database volume is preserved
# ============================================

Write-Host "🔥 Switching to Development Mode with Hot Reload..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop production containers (keeps volumes/data)
Write-Host "Step 1/4: Stopping production containers..." -ForegroundColor Yellow
docker-compose down
Write-Host "✅ Production containers stopped (data preserved)" -ForegroundColor Green
Write-Host ""

# Step 2: Verify database volume exists
Write-Host "Step 2/4: Verifying database volume..." -ForegroundColor Yellow
$volumeExists = docker volume ls --format "{{.Name}}" | Select-String -Pattern "postgres_data"
if ($volumeExists) {
    Write-Host "✅ Database volume 'postgres_data' found - your data is safe!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Warning: Database volume not found. This might be your first run." -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Build development images
Write-Host "Step 3/4: Building development images..." -ForegroundColor Yellow
Write-Host "This will use Dockerfile.dev with hot reload enabled..." -ForegroundColor Gray
docker-compose -f docker-compose.dev.yml build frontend
Write-Host "✅ Development images built" -ForegroundColor Green
Write-Host ""

# Step 4: Start development containers
Write-Host "Step 4/4: Starting development containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml up -d
Write-Host ""

# Wait for containers to be ready
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check status
Write-Host ""
Write-Host "=== Container Status ===" -ForegroundColor Cyan
docker-compose -f docker-compose.dev.yml ps

Write-Host ""
Write-Host "✅ Successfully switched to DEVELOPMENT MODE!" -ForegroundColor Green
Write-Host ""
Write-Host "🔥 HOT RELOAD IS NOW ENABLED!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access your application:" -ForegroundColor White
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:4000" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor White
Write-Host "  1. Edit any file in rrf-portal-nextjs/" -ForegroundColor Gray
Write-Host "  2. Watch terminal for 'Compiled in XXXms'" -ForegroundColor Gray
Write-Host "  3. Refresh browser - changes appear instantly!" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 Useful commands:" -ForegroundColor White
Write-Host "  View logs:    docker-compose -f docker-compose.dev.yml logs -f frontend" -ForegroundColor Gray
Write-Host "  Stop dev:     docker-compose -f docker-compose.dev.yml down" -ForegroundColor Gray
Write-Host "  Restart:      docker-compose -f docker-compose.dev.yml restart frontend" -ForegroundColor Gray
Write-Host ""
