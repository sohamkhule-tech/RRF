# ============================================
# Deploy Job Descriptions Feature
# Automated deployment script
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Job Descriptions Feature Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to project root
$projectRoot = "C:\Users\SohamKhule\Downloads\RRF_2"
Set-Location $projectRoot

Write-Host "[1/4] Executing database migration..." -ForegroundColor Yellow
docker exec -i rrf-postgres-dev psql -U postgres -d rrf_portal -f "/Data/add-job-descriptions-table.sql" 2>&1

if ($LASTEXITCODE -ne 0) {
    # Try alternative method
    Write-Host "Trying alternative migration method..." -ForegroundColor Yellow
    Get-Content "Data\add-job-descriptions-table.sql" | docker exec -i rrf-postgres-dev psql -U postgres -d rrf_portal
}

Write-Host "[2/4] Verifying table creation..." -ForegroundColor Yellow
docker exec -i rrf-postgres-dev psql -U postgres -d rrf_portal -c "SELECT COUNT(*) as jd_count FROM job_descriptions;"

Write-Host "[3/4] Restarting backend to load JobDescriptionsModule..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml restart backend

Write-Host "[4/4] Waiting for backend to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Testing API endpoint..." -ForegroundColor Cyan

# Test API
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/job-descriptions" -Method GET -UseBasicParsing
    Write-Host "✓ API endpoint is working!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
} catch {
    Write-Host "⚠ API endpoint check failed. Please verify backend is running." -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Navigate to Create RRF page" -ForegroundColor White
Write-Host "2. Go to Step 3 (Technical Skills)" -ForegroundColor White
Write-Host "3. Look for 'Select Prefilled JD' dropdown above Job Description" -ForegroundColor White
Write-Host "4. Select a template and watch it auto-fill!" -ForegroundColor White
Write-Host ""
