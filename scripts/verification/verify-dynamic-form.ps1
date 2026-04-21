# Dynamic Form Config System - Quick Verification Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DYNAMIC FORM CONFIG - VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if Docker containers are running
Write-Host "[1/6] Checking Docker containers..." -ForegroundColor Yellow
$containers = docker ps --format "{{.Names}}" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

$backendRunning = $containers | Select-String -Pattern "backend" -Quiet
$dbRunning = $containers | Select-String -Pattern "db" -Quiet

if ($backendRunning -and $dbRunning) {
    Write-Host "✅ Docker containers are running" -ForegroundColor Green
} else {
    Write-Host "❌ Required containers not running. Run: docker-compose up -d" -ForegroundColor Red
    exit 1
}

# Test 2: Add Business Unit field to database
Write-Host ""
Write-Host "[2/6] Adding Business Unit field to database..." -ForegroundColor Yellow
$sqlScript = @"
INSERT INTO form_config (fieldName, label, type, options, step, section, isRequired)
VALUES (
  'businessUnit',
  'Business Unit',
  'dropdown',
  ARRAY['SG', 'VR', 'PMO', 'Internal']::text[],
  1,
  'Organization',
  true
)
ON CONFLICT (fieldName) DO UPDATE SET
  label = EXCLUDED.label,
  options = EXCLUDED.options,
  isRequired = EXCLUDED.isRequired;
"@

$sqlScript | docker exec -i rrf_2-db-1 psql -U postgres -d rrf_portal 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Business Unit field added/updated successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to add Business Unit field" -ForegroundColor Red
}

# Test 3: Verify field exists in database
Write-Host ""
Write-Host "[3/6] Verifying Business Unit in database..." -ForegroundColor Yellow
$result = docker exec -i rrf_2-db-1 psql -U postgres -d rrf_portal -t -c "SELECT COUNT(*) FROM form_config WHERE fieldName = 'businessUnit';" 2>$null

if ($result -match "1") {
    Write-Host "✅ Business Unit field exists in database" -ForegroundColor Green
    
    # Show field details
    Write-Host ""
    Write-Host "Field Details:" -ForegroundColor Cyan
    docker exec -i rrf_2-db-1 psql -U postgres -d rrf_portal -c "SELECT fieldName, label, type, options, isRequired FROM form_config WHERE fieldName = 'businessUnit';"
} else {
    Write-Host "❌ Business Unit field not found in database" -ForegroundColor Red
}

# Test 4: Check all form config fields
Write-Host ""
Write-Host "[4/6] Listing all form config fields..." -ForegroundColor Yellow
Write-Host ""
docker exec -i rrf_2-db-1 psql -U postgres -d rrf_portal -c "SELECT fieldName, label, step, isRequired FROM form_config ORDER BY step, fieldName;"

# Test 5: Test Form Config API endpoint
Write-Host ""
Write-Host "[5/6] Testing Form Config API..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/form-config" -Method GET -ErrorAction Stop
    $configs = $response.Content | ConvertFrom-Json
    
    $businessUnitConfig = $configs | Where-Object { $_.fieldName -eq "businessUnit" }
    
    if ($businessUnitConfig) {
        Write-Host "✅ Form Config API returns Business Unit" -ForegroundColor Green
        Write-Host ""
        Write-Host "Business Unit Config:" -ForegroundColor Cyan
        Write-Host "  Label: $($businessUnitConfig.label)" -ForegroundColor White
        Write-Host "  Type: $($businessUnitConfig.type)" -ForegroundColor White
        Write-Host "  Options: $($businessUnitConfig.options -join ', ')" -ForegroundColor White
        Write-Host "  Required: $($businessUnitConfig.isRequired)" -ForegroundColor White
        Write-Host "  Step: $($businessUnitConfig.step)" -ForegroundColor White
    } else {
        Write-Host "❌ Business Unit not found in API response" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Total fields returned by API: $($configs.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to connect to Form Config API" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Check frontend accessibility
Write-Host ""
Write-Host "[6/6] Checking frontend access..." -ForegroundColor Yellow

try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Frontend is accessible at http://localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Frontend not responding at http://localhost:3000" -ForegroundColor Yellow
    Write-Host "   Make sure Next.js dev server is running: cd rrf-portal-nextjs; npm run dev" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open Form Config UI: http://localhost:3000/pmo/form-config" -ForegroundColor White
Write-Host "2. Verify Business Unit field is visible in Step 1 grid" -ForegroundColor White
Write-Host "3. Test creating a new RRF: http://localhost:3000/hiring-manager/create" -ForegroundColor White
Write-Host "4. Verify Business Unit dropdown appears in Step 1" -ForegroundColor White
Write-Host "5. Test validation by submitting without selecting Business Unit" -ForegroundColor White
Write-Host ""
Write-Host "Full Testing Guide: DYNAMIC_FORM_TESTING_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
