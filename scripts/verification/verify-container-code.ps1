# =============================================================================
# Docker Container Code Verification Script
# =============================================================================
# Purpose: Verify that the frontend container has the latest code changes
# Created: April 16, 2026
# =============================================================================

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Container Code Verification" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if container is running
Write-Host "Checking if frontend container is running..." -ForegroundColor Yellow
$container = docker ps --filter "name=rrf-frontend" --format "{{.Names}}"

if (-not $container) {
    Write-Host "ERROR: Frontend container is not running!" -ForegroundColor Red
    Write-Host "Please start containers with: docker-compose up" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Container found: $container" -ForegroundColor Green
Write-Host ""

# Test 1: Check for old formatDate imports (should return NOTHING)
Write-Host "[Test 1] Checking for old formatDate imports..." -ForegroundColor Yellow
$result = docker exec $container sh -c "grep -r 'import.*formatDate.*dateFormatter' app/ 2>/dev/null || echo 'NONE'"

if ($result -eq "NONE" -or [string]::IsNullOrWhiteSpace($result)) {
    Write-Host "✓ PASS: No old formatDate imports found" -ForegroundColor Green
} else {
    Write-Host "✗ FAIL: Old formatDate imports still exist!" -ForegroundColor Red
    Write-Host $result
    Write-Host ""
    Write-Host "ACTION REQUIRED: Run .\rebuild-docker.ps1 to rebuild with --no-cache" -ForegroundColor Yellow
}
Write-Host ""

# Test 2: Verify native JavaScript is being used
Write-Host "[Test 2] Checking for native Date() usage..." -ForegroundColor Yellow
$result2 = docker exec $container sh -c "grep -r 'new Date.*toLocaleDateString' app/hiring-manager/dashboard/page.jsx 2>/dev/null || echo 'NOT_FOUND'"

if ($result2 -ne "NOT_FOUND" -and -not [string]::IsNullOrWhiteSpace($result2)) {
    Write-Host "✓ PASS: Native JavaScript date formatting found" -ForegroundColor Green
} else {
    Write-Host "✗ FAIL: Native JavaScript not found - stale code detected!" -ForegroundColor Red
    Write-Host ""
    Write-Host "ACTION REQUIRED: Run .\rebuild-docker.ps1 to rebuild with --no-cache" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Check .next build exists
Write-Host "[Test 3] Checking if production build exists..." -ForegroundColor Yellow
$result3 = docker exec $container sh -c "ls -la .next 2>/dev/null | head -5"

if ($result3) {
    Write-Host "✓ PASS: .next build folder exists" -ForegroundColor Green
} else {
    Write-Host "✗ FAIL: .next build folder missing!" -ForegroundColor Red
}
Write-Host ""

# Test 4: Check package.json start script
Write-Host "[Test 4] Checking container start command..." -ForegroundColor Yellow
$result4 = docker inspect --format='{{.Config.Cmd}}' $container

if ($result4 -match "npm start" -or $result4 -match "npm run start") {
    Write-Host "✓ PASS: Using production start command" -ForegroundColor Green
    Write-Host "  Command: $result4" -ForegroundColor Gray
} else {
    Write-Host "⚠ WARNING: Not using production start command" -ForegroundColor Yellow
    Write-Host "  Command: $result4" -ForegroundColor Gray
}
Write-Host ""

# Test 5: Check for volume mounts
Write-Host "[Test 5] Checking for problematic volume mounts..." -ForegroundColor Yellow
$result5 = docker inspect --format='{{range.Mounts}}{{.Source}}->{{.Destination}}{{"\n"}}{{end}}' $container | Select-String -Pattern "rrf-portal-nextjs.*->/app$"

if ($result5) {
    Write-Host "✗ WARNING: Volume mount detected - may override built code!" -ForegroundColor Red
    Write-Host "  Mount: $result5" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  This volume mount can override the container's built code with host files." -ForegroundColor Yellow
    Write-Host "  Recommended: Use docker-compose.yml (no volumes) for production" -ForegroundColor Yellow
    Write-Host "              Use docker-compose.dev.yml (with volumes) for development" -ForegroundColor Yellow
} else {
    Write-Host "✓ PASS: No volume override detected" -ForegroundColor Green
}
Write-Host ""

# Summary
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Verification Complete" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open http://localhost:3000 in browser" -ForegroundColor White
Write-Host "2. Press F12 to open console" -ForegroundColor White
Write-Host "3. Login as Hiring Manager" -ForegroundColor White
Write-Host "4. Check for 'formatDate is not defined' errors" -ForegroundColor White
Write-Host "5. Verify dates display in DD-MM-YYYY format" -ForegroundColor White
Write-Host ""
