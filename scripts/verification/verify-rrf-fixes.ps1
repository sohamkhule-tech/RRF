# Quick Verification Script - RRF Portal Fixes
# Run this script to check if all fixes are working

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "RRF PORTAL - FIX VERIFICATION SCRIPT" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "1. Checking if backend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Backend is running on http://localhost:4000" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend is NOT running. Please start backend first:" -ForegroundColor Red
    Write-Host "      cd rrf-portal-backend" -ForegroundColor Gray
    Write-Host "      npm run start:dev" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host ""

# Check if frontend is running
Write-Host "2. Checking if frontend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Frontend is running on http://localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Frontend is NOT running. Please start frontend:" -ForegroundColor Red
    Write-Host "      cd rrf-portal-nextjs" -ForegroundColor Gray
    Write-Host "      npm run dev" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host ""

# Check if hot reload is working (Docker mode)
Write-Host "3. Checking Docker containers (if using Docker)..." -ForegroundColor Yellow
$dockerContainers = docker ps --format "{{.Names}}" 2>$null
if ($dockerContainers) {
    if ($dockerContainers -match "rrf.*frontend" -or $dockerContainers -match "nextjs") {
        Write-Host "   ✅ Docker containers are running" -ForegroundColor Green
        Write-Host "   Containers: $($dockerContainers -join ', ')" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️ Docker is installed but RRF containers not found" -ForegroundColor DarkYellow
        Write-Host "   (This is OK if you're running in local dev mode)" -ForegroundColor Gray
    }
} else {
    Write-Host "   ℹ️ Docker not running or not installed" -ForegroundColor Gray
    Write-Host "   (This is OK if you're running in local dev mode)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "MANUAL TESTING INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "TEST 1: Step-Based Validation (Issue #2 Fix)" -ForegroundColor Yellow
Write-Host "----------------------------------------------" -ForegroundColor Gray
Write-Host "1. Open: http://localhost:3000/hiring-manager/create-rrf" -ForegroundColor White
Write-Host "2. Fill ONLY 'Job Title' field on Step 1" -ForegroundColor White
Write-Host "3. Click 'Next' button" -ForegroundColor White
Write-Host "4. ✅ Expected: Error showing missing Step 1 fields (Entity, Function, etc.)" -ForegroundColor Green
Write-Host "5. ❌ Should NOT show: 'Job Description is required'" -ForegroundColor Red
Write-Host ""

Write-Host "TEST 2: Business Unit Field (Issue #3 Fix)" -ForegroundColor Yellow
Write-Host "----------------------------------------------" -ForegroundColor Gray
Write-Host "1. Open Developer Console (F12)" -ForegroundColor White
Write-Host "2. Fill complete RRF form including Business Unit field" -ForegroundColor White
Write-Host "3. Click 'Submit'" -ForegroundColor White
Write-Host "4. ✅ Check Console logs for:" -ForegroundColor Green
Write-Host "   [RRF Submit] Key fields check: {" -ForegroundColor Gray
Write-Host "     businessUnit: 'Engineering'  <-- Should be present" -ForegroundColor Gray
Write-Host "   }" -ForegroundColor Gray
Write-Host "5. ✅ After submit, view RRF details - Business Unit should display" -ForegroundColor Green
Write-Host ""

Write-Host "TEST 3: Safe Array Handling (Issue #1 Fix)" -ForegroundColor Yellow
Write-Host "----------------------------------------------" -ForegroundColor Gray
Write-Host "1. Open: http://localhost:3000/hiring-manager/create-rrf" -ForegroundColor White
Write-Host "2. Complete Step 1 and Step 2" -ForegroundColor White
Write-Host "3. On Step 3, leave Technologies EMPTY" -ForegroundColor White
Write-Host "4. Click 'Submit'" -ForegroundColor White
Write-Host "5. ✅ Expected: 'Primary Technologies is required' toast" -ForegroundColor Green
Write-Host "6. ❌ Should NOT crash with: 'Cannot read properties of undefined'" -ForegroundColor Red
Write-Host ""

Write-Host "TEST 4: API Error Handling (Issue #1 Fix)" -ForegroundColor Yellow
Write-Host "----------------------------------------------" -ForegroundColor Gray
Write-Host "1. Stop the backend server (Ctrl+C)" -ForegroundColor White
Write-Host "2. Try to submit a form" -ForegroundColor White
Write-Host "3. ✅ Expected: Clear error message about backend not running" -ForegroundColor Green
Write-Host "4. ✅ Check Console for: [Network Error] log" -ForegroundColor Green
Write-Host "5. Restart backend and try again - should work" -ForegroundColor White
Write-Host ""

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "AUTOMATED VERIFICATION" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking file changes..." -ForegroundColor Yellow
Write-Host ""

# Check if ModernRRFForm.jsx has the validateStep function
$formFile = "rrf-portal-nextjs\components\ModernRRFForm.jsx"
if (Test-Path $formFile) {
    $content = Get-Content $formFile -Raw
    
    if ($content -match "validateStep\s*=\s*\(step\)") {
        Write-Host "   ✅ validateStep function exists (Issue #2 fix)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ validateStep function NOT FOUND" -ForegroundColor Red
    }
    
    if ($content -match "businessUnit:\s*formData\.businessUnit") {
        Write-Host "   ✅ businessUnit explicitly added to payload (Issue #3 fix)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ businessUnit NOT explicitly added to payload" -ForegroundColor Red
    }
    
    if ($content -match "!Array\.isArray\(formData\.technologies\)") {
        Write-Host "   ✅ Safe array checks implemented (Issue #1 fix)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Safe array checks NOT FOUND" -ForegroundColor Red
    }
} else {
    Write-Host "   ⚠️ Cannot find ModernRRFForm.jsx - check file path" -ForegroundColor DarkYellow
}

Write-Host ""

# Check if apiConfig.js has enhanced error handling
$apiFile = "rrf-portal-nextjs\lib\api\apiConfig.js"
if (Test-Path $apiFile) {
    $content = Get-Content $apiFile -Raw
    
    if ($content -match "\[API Request\]") {
        Write-Host "   ✅ Enhanced API logging added (Issue #1 fix)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Enhanced API logging NOT FOUND" -ForegroundColor Red
    }
    
    if ($content -match "404.*endpoint not found") {
        Write-Host "   ✅ 404 error handling improved (Issue #1 fix)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ 404 error handling NOT improved" -ForegroundColor Red
    }
} else {
    Write-Host "   ⚠️ Cannot find apiConfig.js - check file path" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "VERIFICATION COMPLETE" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Follow the manual testing instructions above" -ForegroundColor White
Write-Host "2. Check browser console for detailed logs" -ForegroundColor White
Write-Host "3. Verify all three issues are resolved" -ForegroundColor White
Write-Host ""
Write-Host "For detailed information, see:" -ForegroundColor Yellow
Write-Host "- RRF_COMPLETE_FIX_SUMMARY.md" -ForegroundColor Cyan
Write-Host "- FORM_SUBMISSION_FIX_SUMMARY.md" -ForegroundColor Cyan
Write-Host ""
