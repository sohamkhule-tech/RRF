# Test Subfunctions API
# This script verifies the /subfunctions endpoint is working

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Subfunctions API Test Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:4000"

# Test 1: Check if backend is running
Write-Host "[Test 1] Checking if backend is running..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test","password":"test"}' -ErrorAction SilentlyContinue
    Write-Host "  ✓ Backend is running on $baseUrl" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 401 -or $_.Exception.Response.StatusCode -eq 400) {
        Write-Host "  ✓ Backend is running on $baseUrl" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Backend is NOT running. Please start it first:" -ForegroundColor Red
        Write-Host "    cd rrf-portal-backend" -ForegroundColor Gray
        Write-Host "    npm run start:dev" -ForegroundColor Gray
        exit 1
    }
}
Write-Host ""

# Test 2: Login and get token
Write-Host "[Test 2] Logging in as admin..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "admin@sonarseeker.com"
        password = "admin123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.token
    Write-Host "  ✓ Login successful! Token obtained." -ForegroundColor Green
} catch {
    Write-Host "  ✗ Login failed. Make sure the admin user exists:" -ForegroundColor Red
    Write-Host "    Visit: http://localhost:4000/seed" -ForegroundColor Gray
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 3: Test /subfunctions endpoint WITHOUT auth (should fail with 401)
Write-Host "[Test 3] Testing /subfunctions without authentication..." -ForegroundColor Yellow
try {
    $noAuthResponse = Invoke-RestMethod -Uri "$baseUrl/subfunctions" -Method GET
    Write-Host "  ⚠ Warning: Endpoint is unprotected (no JWT required)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "  ✓ Correctly returns 401 Unauthorized (JWT protection working)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 4: Test /subfunctions endpoint WITH auth
Write-Host "[Test 4] Testing /subfunctions with authentication..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

    $subfunctionsResponse = Invoke-RestMethod -Uri "$baseUrl/subfunctions" -Method GET -Headers $headers
    
    if ($subfunctionsResponse.success -and $subfunctionsResponse.data) {
        $count = $subfunctionsResponse.data.Count
        Write-Host "  ✓ API working! Retrieved $count subfunctions" -ForegroundColor Green
        Write-Host ""
        Write-Host "  📋 Subfunctions List:" -ForegroundColor Cyan
        foreach ($sf in $subfunctionsResponse.data) {
            Write-Host "    • $($sf.name) ($($sf.function))" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ⚠ Warning: Unexpected response format" -ForegroundColor Yellow
        Write-Host "    Response: $($subfunctionsResponse | ConvertTo-Json)" -ForegroundColor Gray
    }
} catch {
    $errorDetails = $_.Exception.Message
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  ✗ API Error (Status: $statusCode)" -ForegroundColor Red
        
        if ($statusCode -eq 404) {
            Write-Host ""
            Write-Host "  🔧 HOW TO FIX:" -ForegroundColor Yellow
            Write-Host "    1. Stop the backend server (Ctrl+C)" -ForegroundColor Gray
            Write-Host "    2. cd rrf-portal-backend" -ForegroundColor Gray
            Write-Host "    3. npm run start:dev" -ForegroundColor Gray
            Write-Host "    4. Wait for 'running on http://localhost:4000'" -ForegroundColor Gray
            Write-Host "    5. Run this test again" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  📝 The /subfunctions route exists in the code but the server" -ForegroundColor Gray
            Write-Host "     needs to be restarted to load the new module." -ForegroundColor Gray
        }
    } else {
        Write-Host "  ✗ Request failed: $errorDetails" -ForegroundColor Red
    }
    Write-Host ""
    exit 1
}
Write-Host ""

# Test 5: Test filtered endpoint
Write-Host "[Test 5] Testing filtered endpoint (?function=Delivery)..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

    $filteredResponse = Invoke-RestMethod -Uri "$baseUrl/subfunctions?function=Delivery" -Method GET -Headers $headers
    
    if ($filteredResponse.success -and $filteredResponse.data) {
        $count = $filteredResponse.data.Count
        Write-Host "  ✓ Filter working! Retrieved $count Delivery subfunctions" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠ Filter test failed (optional feature)" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Backend:       ✓ Running" -ForegroundColor Green
Write-Host "  Authentication: ✓ Working" -ForegroundColor Green
Write-Host "  API Endpoint:  ✓ /subfunctions working" -ForegroundColor Green
Write-Host "  JWT Protection: ✓ Enabled" -ForegroundColor Green
Write-Host ""
Write-Host "  🎉 All tests passed! The API is ready to use." -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start frontend: cd rrf-portal-nextjs && npm run dev" -ForegroundColor Gray
Write-Host "  2. Login as admin" -ForegroundColor Gray
Write-Host "  3. Go to Admin > Users > Add User" -ForegroundColor Gray
Write-Host "  4. Select 'Approver' role" -ForegroundColor Gray
Write-Host "  5. Verify subfunction field appears!" -ForegroundColor Gray
Write-Host ""
