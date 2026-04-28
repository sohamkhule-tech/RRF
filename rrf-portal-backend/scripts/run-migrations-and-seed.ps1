# ====================================================================
# Database Migration & Seeding - Complete Workflow
# ====================================================================

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  Step-by-Step Database Setup" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# Configuration
$DB_CONTAINER = "rrf-postgres-dev"
$DB_NAME = "rrf_portal"
$DB_USER = "postgres"
$DB_PASS = "postgres"
$BACKEND_CONTAINER = "rrf-backend-dev"
$PROJECT_ROOT = "C:\Users\SohamKhule\Downloads\RRF_2"

Write-Host "STEP 1: Run Migrations (Create Schema)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

Write-Host "Command:" -ForegroundColor Cyan
Write-Host "docker exec -it $BACKEND_CONTAINER npm run migration:run`n" -ForegroundColor White

Write-Host "Executing..." -ForegroundColor Green
docker exec -it $BACKEND_CONTAINER npm run migration:run

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Migrations completed successfully!`n" -ForegroundColor Green
} else {
    Write-Host "`n❌ Migration failed. Check errors above.`n" -ForegroundColor Red
    exit 1
}

Write-Host "STEP 2: Verify Migration Status" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray
docker exec -it $BACKEND_CONTAINER npm run migration:show

Write-Host "`n`nSTEP 3: Execute Seed Files" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

# Get all SQL files from Data folder
$seedFiles = Get-ChildItem -Path "$PROJECT_ROOT\Data" -Filter "seed*.sql" | Sort-Object Name

if ($seedFiles.Count -eq 0) {
    Write-Host "⚠️  No seed files found in Data folder`n" -ForegroundColor Yellow
} else {
    Write-Host "Found $($seedFiles.Count) seed file(s):`n" -ForegroundColor Cyan
    
    foreach ($file in $seedFiles) {
        Write-Host "  📄 $($file.Name)" -ForegroundColor White
    }
    
    Write-Host "`nExecuting seed files...`n" -ForegroundColor Green
    
    foreach ($file in $seedFiles) {
        Write-Host "Seeding: $($file.Name)" -ForegroundColor Cyan
        Get-Content $file.FullName | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ $($file.Name) completed" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  $($file.Name) had warnings (may be normal for INSERT conflicts)" -ForegroundColor Yellow
        }
        Write-Host ""
    }
}

Write-Host "STEP 4: Verify Database Contents" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

Write-Host "Checking tables..." -ForegroundColor Cyan
docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "\dt"

Write-Host "`nChecking record counts..." -ForegroundColor Cyan

# Check common tables
$tables = @("users", "roles", "permissions", "modules", "functions", "subfunctions")

foreach ($table in $tables) {
    $count = docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM $table" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  $table : $count records" -ForegroundColor White
    }
}

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "  ✅ Database Setup Complete!" -ForegroundColor Green
Write-Host "=========================================`n" -ForegroundColor Green

Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Start your application:" -ForegroundColor White
Write-Host "     docker-compose -f docker-compose.dev.yml up`n" -ForegroundColor Gray
Write-Host "  2. Test login with admin credentials from seed files`n" -ForegroundColor White
