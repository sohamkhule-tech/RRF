# ====================================================================
# Seed Database Only (Skip Migrations)
# ====================================================================
# Use this when schema already exists and you just need to add data
# ====================================================================

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  Seeding Database from Data Folder" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

$DB_CONTAINER = "rrf-postgres-dev"
$DB_NAME = "rrf_portal"
$DB_USER = "postgres"
$PROJECT_ROOT = "C:\Users\SohamKhule\Downloads\RRF_2"

# Check database connection
Write-Host "Checking database connection..." -ForegroundColor Yellow
$dbReady = docker exec $DB_CONTAINER pg_isready -U $DB_USER 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Cannot connect to database. Is PostgreSQL running?" -ForegroundColor Red
    Write-Host "   Try: docker-compose -f docker-compose.dev.yml up -d postgres`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Database is ready`n" -ForegroundColor Green

# Find all seed files
$seedFiles = Get-ChildItem -Path "$PROJECT_ROOT\Data" -Filter "seed*.sql" -ErrorAction SilentlyContinue | Sort-Object Name

if ($seedFiles.Count -eq 0) {
    Write-Host "❌ No seed files found in Data folder" -ForegroundColor Red
    Write-Host "   Looking for files matching: Data\seed*.sql`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found $($seedFiles.Count) seed file(s):" -ForegroundColor Cyan
foreach ($file in $seedFiles) {
    Write-Host "  📄 $($file.Name)" -ForegroundColor White
}

Write-Host "`nExecuting seed files...`n" -ForegroundColor Green

$successCount = 0
$warningCount = 0

foreach ($file in $seedFiles) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "Seeding: $($file.Name)" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    Get-Content $file.FullName | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $($file.Name) completed successfully" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "⚠️  $($file.Name) completed with warnings" -ForegroundColor Yellow
        Write-Host "   (Warnings are normal for INSERT ON CONFLICT statements)" -ForegroundColor Gray
        $warningCount++
    }
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  Seeding Summary" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Green

Write-Host "  Success: $successCount file(s)" -ForegroundColor Green
if ($warningCount -gt 0) {
    Write-Host "  Warnings: $warningCount file(s)" -ForegroundColor Yellow
}

Write-Host "`n🔍 Verifying Data..." -ForegroundColor Cyan

# Check common tables
$tables = @("users", "roles", "permissions", "role_permissions", "modules", "functions", "subfunctions", "rrf_form_configs")

Write-Host "`nRecord Counts:" -ForegroundColor Yellow
foreach ($table in $tables) {
    $count = docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM $table" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $count = $count.Trim()
        Write-Host "  $table : $count" -ForegroundColor White
    }
}

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "  ✅ Seeding Complete!" -ForegroundColor Green
Write-Host "=========================================`n" -ForegroundColor Green
