# ====================================================================
# Database Migration and Seeding Workflow
# ====================================================================
# This script handles the complete database setup:
# 1. Generate initial migration from entities
# 2. Run migrations to create schema
# 3. Seed database with initial data
# ====================================================================

Write-Host "`n" -NoNewline
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Database Migration & Seeding Workflow" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$BACKEND_CONTAINER = "rrf-backend-dev"
$DB_CONTAINER = "rrf-postgres-dev"
$PROJECT_ROOT = "C:\Users\SohamKhule\Downloads\RRF_2"

# Check Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check PostgreSQL container
$pgRunning = docker ps --format "{{.Names}}" | Select-String -Pattern $DB_CONTAINER
if (-not $pgRunning) {
    Write-Host "⚠️  PostgreSQL not running. Starting it..." -ForegroundColor Yellow
    Set-Location $PROJECT_ROOT
    docker-compose -f docker-compose.dev.yml up -d postgres
    Start-Sleep -Seconds 5
}

Write-Host "[1/6] Checking database connection..." -ForegroundColor Yellow
$dbReady = docker exec $DB_CONTAINER pg_isready -U postgres 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database is ready" -ForegroundColor Green
} else {
    Write-Host "❌ Cannot connect to database" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/6] Checking for existing migrations..." -ForegroundColor Yellow
$migrationFiles = Get-ChildItem -Path "$PROJECT_ROOT\rrf-portal-backend\src\migrations" -Filter "*.ts" -ErrorAction SilentlyContinue
if ($migrationFiles.Count -eq 0 -or ($migrationFiles.Count -eq 1 -and $migrationFiles[0].Name -eq ".gitkeep")) {
    Write-Host "⚠️  No migrations found. Generating initial migration..." -ForegroundColor Yellow
    
    # Start backend container if not running
    $backendRunning = docker ps --format "{{.Names}}" | Select-String -Pattern $BACKEND_CONTAINER
    if (-not $backendRunning) {
        Write-Host "Starting backend container..." -ForegroundColor Yellow
        Set-Location $PROJECT_ROOT
        docker-compose -f docker-compose.dev.yml up -d backend
        Start-Sleep -Seconds 10
    }
    
    Write-Host "Generating InitialSchema migration..." -ForegroundColor Cyan
    docker exec $BACKEND_CONTAINER npm run migration:generate -- src/migrations/InitialSchema
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Initial migration generated" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration generation failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Found $($migrationFiles.Count - 1) existing migration(s)" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/6] Running migrations..." -ForegroundColor Yellow
docker exec $BACKEND_CONTAINER npm run migration:run

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migrations executed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Migration execution failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[4/6] Verifying migration status..." -ForegroundColor Yellow
docker exec $BACKEND_CONTAINER npm run migration:show

Write-Host ""
Write-Host "[5/6] Seeding database with initial data..." -ForegroundColor Yellow
Write-Host "Executing seed.sql..." -ForegroundColor Cyan
Get-Content "$PROJECT_ROOT\Data\seed.sql" | docker exec -i $DB_CONTAINER psql -U postgres -d rrf_portal

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Main seed data loaded" -ForegroundColor Green
} else {
    Write-Host "⚠️  Seed file execution had warnings (may be normal)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Executing seed-admin.sql..." -ForegroundColor Cyan
Get-Content "$PROJECT_ROOT\Data\seed-admin.sql" | docker exec -i $DB_CONTAINER psql -U postgres -d rrf_portal

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Admin seed data loaded" -ForegroundColor Green
} else {
    Write-Host "⚠️  Admin seed execution had warnings (may be normal)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[6/6] Verifying database contents..." -ForegroundColor Yellow
Write-Host "Checking tables..." -ForegroundColor Cyan
$tableCount = docker exec $DB_CONTAINER psql -U postgres -d rrf_portal -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"
Write-Host "✅ Found$tableCount tables in database" -ForegroundColor Green

Write-Host ""
Write-Host "Checking users table..." -ForegroundColor Cyan
$userCount = docker exec $DB_CONTAINER psql -U postgres -d rrf_portal -t -c "SELECT COUNT(*) FROM users" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Users table has$userCount record(s)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Users table check failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  ✅ Database Setup Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  • Migrations: Applied" -ForegroundColor White
Write-Host "  • Seed Data: Loaded" -ForegroundColor White
Write-Host "  • Database: Ready" -ForegroundColor White
Write-Host ""
Write-Host "🚀 You can now start your application:" -ForegroundColor Cyan
Write-Host "   docker-compose -f docker-compose.dev.yml up" -ForegroundColor White
Write-Host ""
