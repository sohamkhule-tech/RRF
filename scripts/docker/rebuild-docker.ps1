# =============================================================================
# Docker Rebuild Script - Complete Cache Clear
# =============================================================================
# Purpose: Rebuild Docker containers with NO CACHE to ensure all code changes
#          are properly included in the new build
# Created: April 16, 2026
# Usage: Run this script from the root of RRF_2 project directory
# =============================================================================

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Docker Complete Rebuild (No Cache)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop all running containers
Write-Host "[1/5] Stopping all running containers..." -ForegroundColor Yellow
docker-compose down
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error stopping containers!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Containers stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Remove all Docker build cache, images, and volumes
Write-Host "[2/5] Removing ALL Docker cache, unused images, and stopped containers..." -ForegroundColor Yellow
Write-Host "WARNING: This will free up significant disk space but takes a few minutes." -ForegroundColor Yellow
docker system prune -a -f --volumes
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error during system prune!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Docker cache cleared" -ForegroundColor Green
Write-Host ""

# Step 2.5: Clean host .next build cache
Write-Host "[2.5/5] Cleaning host .next build cache..." -ForegroundColor Yellow
if (Test-Path "rrf-portal-nextjs\.next") {
    Remove-Item -Recurse -Force "rrf-portal-nextjs\.next"
    Write-Host "✓ Host .next folder removed" -ForegroundColor Green
} else {
    Write-Host "✓ No .next folder found (already clean)" -ForegroundColor Green
}
Write-Host ""

# Step 3: Rebuild images from scratch (NO CACHE)
Write-Host "[3/5] Rebuilding Docker images from scratch (this may take 5-10 minutes)..." -ForegroundColor Yellow
docker-compose build --no-cache
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error building images!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Images rebuilt successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Start containers
Write-Host "[4/5] Starting containers..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error starting containers!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Containers started" -ForegroundColor Green
Write-Host ""

# Step 5: Show logs
Write-Host "[5/5] Displaying frontend logs (Press Ctrl+C to exit logs)..." -ForegroundColor Yellow
Write-Host ""
Start-Sleep -Seconds 3
docker-compose logs -f frontend

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Rebuild Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait for 'compiled successfully' message in logs" -ForegroundColor White
Write-Host "2. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "3. Test Hiring Manager login and dashboard" -ForegroundColor White
Write-Host "4. Verify NO 'formatDate is not defined' errors in console" -ForegroundColor White
Write-Host ""
