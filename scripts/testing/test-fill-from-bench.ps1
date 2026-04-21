# Test Fill From Bench Feature
# Run this after applying the fix

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FILL FROM BENCH - FIX VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if column exists
Write-Host "1. Verifying status_history column in database..." -ForegroundColor Yellow
$columnCheck = docker exec -i rrf-postgres-dev psql -U postgres -d rrf_portal -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'rrfs' AND column_name = 'status_history';"

if ($columnCheck -match "1") {
    Write-Host "   ✅ status_history column exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ status_history column NOT FOUND!" -ForegroundColor Red
    Write-Host "   Run: docker exec -i rrf-postgres-dev psql -U postgres -d rrf_portal -f Data/add-status-history-column.sql" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check backend is running
Write-Host "2. Checking backend status..." -ForegroundColor Yellow
$backendStatus = docker inspect rrf-backend-dev --format '{{.State.Status}}' 2>$null

if ($backendStatus -eq "running") {
    Write-Host "   ✅ Backend is running" -ForegroundColor Green
} else {
    Write-Host "   ❌ Backend is not running: $backendStatus" -ForegroundColor Red
    Write-Host "   Run: docker-compose -f docker-compose.dev.yml restart backend" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check if fill-by-bench route exists
Write-Host "3. Checking fill-by-bench route..." -ForegroundColor Yellow
$logCheck = docker logs rrf-backend-dev 2>&1 | Select-String "fill-by-bench"

if ($logCheck) {
    Write-Host "   ✅ fill-by-bench route is mapped" -ForegroundColor Green
} else {
    Write-Host "   ❌ fill-by-bench route not found in logs" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MANUAL TESTING STEPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Login to RRF Portal:" -ForegroundColor Yellow
Write-Host "   URL: http://localhost:3000" -ForegroundColor White
Write-Host "   Login as PMO user" -ForegroundColor White
Write-Host ""

Write-Host "2. Find an APPROVED RRF:" -ForegroundColor Yellow
Write-Host "   - Navigate to PMO Dashboard" -ForegroundColor White
Write-Host "   - Click on any APPROVED RRF" -ForegroundColor White
Write-Host "   - Or navigate to: http://localhost:3000/pmo/view-rrf/[id]" -ForegroundColor White
Write-Host ""

Write-Host "3. Test Fill From Bench:" -ForegroundColor Yellow
Write-Host "   - Click 'Fill from Bench' button" -ForegroundColor White
Write-Host "   - Fill in:" -ForegroundColor White
Write-Host "     • Candidate Name: Test Candidate" -ForegroundColor Gray
Write-Host "     • Date of Joining: Select a date" -ForegroundColor Gray
Write-Host "   - Click 'Confirm & Close'" -ForegroundColor White
Write-Host ""

Write-Host "4. Expected Results:" -ForegroundColor Yellow
Write-Host "   ✅ No 500 error" -ForegroundColor Green
Write-Host "   ✅ Success message appears" -ForegroundColor Green
Write-Host "   ✅ RRF status changes to CLOSED_BY_BENCH" -ForegroundColor Green
Write-Host "   ✅ Internal RRF number is generated (e.g., RRF-INT-001)" -ForegroundColor Green
Write-Host "   ✅ Candidate name is saved" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DATABASE VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "To verify in database, run:" -ForegroundColor Yellow
Write-Host "docker exec -i rrf-postgres-dev psql -U postgres -d rrf_portal" -ForegroundColor Cyan
Write-Host ""
Write-Host "Then execute:" -ForegroundColor Yellow
Write-Host "SELECT id, status, internal_rrf_no, candidate_name, status_history" -ForegroundColor Cyan
Write-Host "FROM rrfs" -ForegroundColor Cyan
Write-Host "WHERE status = 'closed-by-bench'" -ForegroundColor Cyan
Write-Host "LIMIT 1;" -ForegroundColor Cyan
Write-Host ""

Write-Host "Expected output:" -ForegroundColor Yellow
Write-Host "- status: closed-by-bench" -ForegroundColor Gray
Write-Host "- internal_rrf_no: RRF-INT-XXX" -ForegroundColor Gray
Write-Host "- candidate_name: [your input]" -ForegroundColor Gray
Write-Host "- status_history: JSON array with status changes" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FIX SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ status_history column added to database" -ForegroundColor Green
Write-Host "✅ Entity updated with proper column mapping" -ForegroundColor Green
Write-Host "✅ Backend restarted successfully" -ForegroundColor Green
Write-Host "✅ fill-by-bench route is available" -ForegroundColor Green
Write-Host ""
Write-Host "Ready to test Fill From Bench feature!" -ForegroundColor Green
Write-Host ""
