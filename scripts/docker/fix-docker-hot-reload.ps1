# ====================================================================
# RRF PORTAL - DOCKER HOT RELOAD FIX SCRIPT
# ====================================================================
# This script fixes Docker container sync issues when code changes
# aren't reflecting in the running application.
# ====================================================================

param(
    [switch]$Quick,      # Quick restart without full rebuild
    [switch]$Full,       # Full rebuild clearing all caches
    [switch]$Diagnose    # Only run diagnostics
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RRF PORTAL - DOCKER HOT RELOAD FIX" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to project root directory
$scriptLocation = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptLocation

# ====================================================================
# STEP 1: DIAGNOSE CURRENT STATE
# ====================================================================

Write-Host "[STEP 1] Diagnosing current state..." -ForegroundColor Yellow
Write-Host ""

# Check running containers
Write-Host "Running containers:" -ForegroundColor White
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Write-Host

Write-Host ""

# Check if dev or production mode
$devContainers = docker ps --filter "name=dev" --format "{{.Names}}"
$prodContainers = docker ps --filter "name=rrf" --format "{{.Names}}" | Where-Object { $_ -notmatch "dev" }

if ($devContainers) {
    Write-Host "✅ Running in DEV mode (hot reload enabled)" -ForegroundColor Green
    $mode = "dev"
} elseif ($prodContainers) {
    Write-Host "⚠️  Running in PRODUCTION mode (no hot reload)" -ForegroundColor Yellow
    Write-Host "   To enable hot reload, switch to dev mode:" -ForegroundColor Gray
    Write-Host "   docker-compose -f docker-compose.dev.yml up" -ForegroundColor Gray
    $mode = "prod"
} else {
    Write-Host "❌ No containers running" -ForegroundColor Red
    $mode = "none"
}

Write-Host ""

# Check for stale build artifacts
Write-Host "Checking for stale build artifacts:" -ForegroundColor White

$nextFolder = "rrf-portal-nextjs\.next"
$distFolder = "rrf-portal-backend\dist"
$nodeModulesFrontend = "rrf-portal-nextjs\node_modules"
$nodeModulesBackend = "rrf-portal-backend\node_modules"

if (Test-Path $nextFolder) {
    $nextSize = (Get-ChildItem $nextFolder -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "   ⚠️  .next folder exists ($([math]::Round($nextSize, 2)) MB)" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ .next folder: clean" -ForegroundColor Green
}

if (Test-Path $distFolder) {
    $distSize = (Get-ChildItem $distFolder -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "   ⚠️  dist folder exists ($([math]::Round($distSize, 2)) MB)" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ dist folder: clean" -ForegroundColor Green
}

Write-Host ""

# Check volume mounts (if dev mode)
if ($mode -eq "dev") {
    Write-Host "Checking volume mounts:" -ForegroundColor White
    
    $backendMount = docker inspect rrf-backend-dev --format '{{range .Mounts}}{{if eq .Destination "/app"}}{{.Source}}{{end}}{{end}}' 2>$null
    $frontendMount = docker inspect rrf-frontend-dev --format '{{range .Mounts}}{{if eq .Destination "/app"}}{{.Source}}{{end}}{{end}}' 2>$null
    
    if ($backendMount) {
        Write-Host "   ✅ Backend volume mounted: $backendMount" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Backend volume NOT mounted" -ForegroundColor Red
    }
    
    if ($frontendMount) {
        Write-Host "   ✅ Frontend volume mounted: $frontendMount" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Frontend volume NOT mounted" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# If diagnose only, exit here
if ($Diagnose) {
    Write-Host "Diagnosis complete. Use -Quick or -Full to fix issues." -ForegroundColor Yellow
    exit 0
}

# ====================================================================
# STEP 2: ASK USER FOR ACTION
# ====================================================================

if (-not $Quick -and -not $Full) {
    Write-Host "Choose fix option:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. QUICK FIX (recommended)" -ForegroundColor Green
    Write-Host "   - Restart containers only" -ForegroundColor Gray
    Write-Host "   - Preserves database data" -ForegroundColor Gray
    Write-Host "   - Fast (30 seconds)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. FULL REBUILD" -ForegroundColor Red
    Write-Host "   - Clears all caches and rebuilds" -ForegroundColor Gray
    Write-Host "   - Deletes .next and dist folders" -ForegroundColor Gray
    Write-Host "   - Slow (3-5 minutes)" -ForegroundColor Gray
    Write-Host ""
    $choice = Read-Host "Enter choice (1 or 2)"
    
    if ($choice -eq "1") {
        $Quick = $true
    } elseif ($choice -eq "2") {
        $Full = $true
    } else {
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ====================================================================
# STEP 3: QUICK FIX (RESTART ONLY)
# ====================================================================

if ($Quick) {
    Write-Host "[QUICK FIX] Restarting containers..." -ForegroundColor Yellow
    Write-Host ""
    
    # Stop containers
    Write-Host "Stopping containers..." -ForegroundColor White
    docker-compose -f docker-compose.dev.yml down
    
    Write-Host ""
    Write-Host "Starting containers..." -ForegroundColor White
    docker-compose -f docker-compose.dev.yml up -d
    
    Write-Host ""
    Write-Host "✅ Containers restarted!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Waiting for services to be healthy (30 seconds)..." -ForegroundColor Gray
    Start-Sleep -Seconds 30
}

# ====================================================================
# STEP 4: FULL REBUILD (CLEAR CACHES + REBUILD)
# ====================================================================

if ($Full) {
    Write-Host "[FULL REBUILD] Clearing caches and rebuilding..." -ForegroundColor Yellow
    Write-Host ""
    
    # Stop and remove containers
    Write-Host "Step 1/6: Stopping containers..." -ForegroundColor White
    docker-compose -f docker-compose.dev.yml down -v
    
    Write-Host ""
    Write-Host "Step 2/6: Clearing Next.js build cache (.next)..." -ForegroundColor White
    if (Test-Path $nextFolder) {
        Remove-Item -Path $nextFolder -Recurse -Force
        Write-Host "   ✅ Deleted .next folder" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  .next folder not found (already clean)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Step 3/6: Clearing NestJS build cache (dist)..." -ForegroundColor White
    if (Test-Path $distFolder) {
        Remove-Item -Path $distFolder -Recurse -Force
        Write-Host "   ✅ Deleted dist folder" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  dist folder not found (already clean)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Step 4/6: Clearing Docker build cache..." -ForegroundColor White
    docker builder prune -f
    
    Write-Host ""
    Write-Host "Step 5/6: Rebuilding containers (this may take 3-5 minutes)..." -ForegroundColor White
    docker-compose -f docker-compose.dev.yml build --no-cache
    
    Write-Host ""
    Write-Host "Step 6/6: Starting containers..." -ForegroundColor White
    docker-compose -f docker-compose.dev.yml up -d
    
    Write-Host ""
    Write-Host "✅ Full rebuild complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Waiting for services to be healthy (30 seconds)..." -ForegroundColor Gray
    Start-Sleep -Seconds 30
}

# ====================================================================
# STEP 5: VERIFY CONTAINERS ARE RUNNING
# ====================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[VERIFICATION] Checking container health..." -ForegroundColor Yellow
Write-Host ""

$backendStatus = docker inspect rrf-backend-dev --format '{{.State.Status}}' 2>$null
$frontendStatus = docker inspect rrf-frontend-dev --format '{{.State.Status}}' 2>$null
$postgresStatus = docker inspect rrf-postgres-dev --format '{{.State.Status}}' 2>$null

if ($backendStatus -eq "running") {
    Write-Host "✅ Backend: RUNNING" -ForegroundColor Green
} else {
    Write-Host "❌ Backend: $backendStatus" -ForegroundColor Red
}

if ($frontendStatus -eq "running") {
    Write-Host "✅ Frontend: RUNNING" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend: $frontendStatus" -ForegroundColor Red
}

if ($postgresStatus -eq "running") {
    Write-Host "✅ Database: RUNNING" -ForegroundColor Green
} else {
    Write-Host "❌ Database: $postgresStatus" -ForegroundColor Red
}

Write-Host ""

# ====================================================================
# STEP 6: CHECK LOGS FOR ERRORS
# ====================================================================

Write-Host "[LOGS] Checking for recent errors..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Backend logs (last 20 lines):" -ForegroundColor White
Write-Host "-------------------------------" -ForegroundColor Gray
docker logs --tail 20 rrf-backend-dev 2>&1 | Select-Object -Last 20 | Write-Host
Write-Host ""

Write-Host "Frontend logs (last 20 lines):" -ForegroundColor White
Write-Host "--------------------------------" -ForegroundColor Gray
docker logs --tail 20 rrf-frontend-dev 2>&1 | Select-Object -Last 20 | Write-Host
Write-Host ""

# ====================================================================
# STEP 7: TEST API CONNECTIVITY
# ====================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[CONNECTIVITY TEST] Testing backend API..." -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Seconds 5  # Give backend time to start

try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Backend API is responding (Status: $($response.StatusCode))" -ForegroundColor Green
    Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend API is NOT responding" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Check backend logs with:" -ForegroundColor Yellow
    Write-Host "   docker logs rrf-backend-dev -f" -ForegroundColor Gray
}

Write-Host ""

# ====================================================================
# STEP 8: TEST FRONTEND CONNECTIVITY
# ====================================================================

Write-Host "[CONNECTIVITY TEST] Testing frontend..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Frontend is responding (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend is NOT responding" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Check frontend logs with:" -ForegroundColor Yellow
    Write-Host "   docker logs rrf-frontend-dev -f" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ====================================================================
# STEP 9: FINAL INSTRUCTIONS
# ====================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Open your browser:" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:4000" -ForegroundColor Cyan
Write-Host ""

Write-Host "2. Test the fixed issues:" -ForegroundColor Yellow
Write-Host "   - Submit RRF form (should work without 500/404 errors)" -ForegroundColor White
Write-Host "   - Check step validation (no premature popups)" -ForegroundColor White
Write-Host "   - Verify Business Unit field is saved" -ForegroundColor White
Write-Host ""

Write-Host "3. Monitor logs in real-time:" -ForegroundColor Yellow
Write-Host "   Backend:  docker logs rrf-backend-dev -f" -ForegroundColor Gray
Write-Host "   Frontend: docker logs rrf-frontend-dev -f" -ForegroundColor Gray
Write-Host ""

Write-Host "4. If hot reload isn't working:" -ForegroundColor Yellow
Write-Host "   - File changes should auto-reload within 2-3 seconds" -ForegroundColor White
Write-Host "   - If not, run this script again with -Full flag" -ForegroundColor White
Write-Host "   - Or manually restart: docker-compose -f docker-compose.dev.yml restart" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ DOCKER HOT RELOAD FIX COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
