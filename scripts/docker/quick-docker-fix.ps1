# Quick Docker Fix - Use this for immediate fix
# Usage: .\quick-docker-fix.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "QUICK DOCKER CONTAINER RESTART" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Go to project root
cd C:\Users\SohamKhule\Downloads\RRF_2

Write-Host "1. Stopping containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml down

Write-Host ""
Write-Host "2. Removing stale build cache..." -ForegroundColor Yellow

# Clear Next.js cache
if (Test-Path "rrf-portal-nextjs\.next") {
    Remove-Item -Path "rrf-portal-nextjs\.next" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Cleared .next folder" -ForegroundColor Green
}

# Clear NestJS cache
if (Test-Path "rrf-portal-backend\dist") {
    Remove-Item -Path "rrf-portal-backend\dist" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Cleared dist folder" -ForegroundColor Green
}

Write-Host ""
Write-Host "3. Rebuilding and starting containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml up -d --build

Write-Host ""
Write-Host "4. Waiting for services to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "5. Checking container status..." -ForegroundColor Yellow
docker ps --format "table {{.Names}}\t{{.Status}}"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "2. Test the RRF form submission" -ForegroundColor White
Write-Host "3. Monitor logs with:" -ForegroundColor White
Write-Host "   docker logs rrf-backend-dev -f" -ForegroundColor Gray
Write-Host "   docker logs rrf-frontend-dev -f" -ForegroundColor Gray
Write-Host ""

# Test API
Write-Host "Testing backend API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend API is responding!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend API not ready yet. Wait 30 more seconds." -ForegroundColor Yellow
}

Write-Host ""
