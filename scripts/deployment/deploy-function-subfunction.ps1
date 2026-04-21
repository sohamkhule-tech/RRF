# Function-SubFunction Migration Script
# Run this to apply the database changes and restart backend

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Function-SubFunction Migration & Deployment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Apply database migration
Write-Host "Step 1: Applying database migration..." -ForegroundColor Yellow
docker exec -i rrf-postgres-dev psql -U postgres -d rrf_portal -f Data/add-functions-table.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "├─ ✅ Database migration applied successfully" -ForegroundColor Green
} else {
    Write-Host "├─ ❌ Migration failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Verify functions table
Write-Host "Step 2: Verifying functions table..." -ForegroundColor Yellow
$functionsCount = docker exec -i rrf-postgres-dev psql -U postgres -d rrf_portal -t -c "SELECT COUNT(*) FROM functions;"

Write-Host "├─ Functions table created with $functionsCount records" -ForegroundColor Green

Write-Host ""

# Step 3: Check subfunctions linkage
Write-Host "Step 3: Verifying subfunction linkage..." -ForegroundColor Yellow
$linkedCount = docker exec -i rrf-postgres-dev psql -U postgres -d rrf_portal -t -c "SELECT COUNT(*) FROM subfunctions WHERE function_id IS NOT NULL;"

Write-Host "├─ $linkedCount subfunctions linked to functions" -ForegroundColor Green

Write-Host ""

# Step 4: Restart backend
Write-Host "Step 4: Restarting backend to load new entities..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml restart backend

if ($LASTEXITCODE -eq 0) {
    Write-Host "├─ ✅ Backend restarted successfully" -ForegroundColor Green
} else {
    Write-Host "├─ ❌ Backend restart failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 5: Wait for backend to be ready
Write-Host "Step 5: Waiting for backend to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""

# Step 6: Check backend logs
Write-Host "Step 6: Checking backend logs..." -ForegroundColor Yellow
docker logs rrf-backend-dev --tail 20

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Next Steps:" -ForegroundColor Yellow
Write-Host "1. Test API endpoints:" -ForegroundColor White
Write-Host "   curl http://localhost:4000/functions" -ForegroundColor Gray
Write-Host "   curl http://localhost:4000/functions/1/subfunctions" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Implement frontend components (see FUNCTION_SUBFUNCTION_IMPLEMENTATION.md)" -ForegroundColor White
Write-Host ""
Write-Host "3. Update ModernRRFForm to use dependent dropdowns" -ForegroundColor White
Write-Host ""
