# Admin Dashboard Statistics Diagnostic Script
# This script tests all potential issues with admin statistics showing zero

Write-Host "`n╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   RRF Admin Dashboard Statistics Diagnostic Tool      ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$issuesFound = @()
$allGood = $true

# Test 1: Check Docker Containers
Write-Host "`n[1/6] Checking Docker containers..." -ForegroundColor Yellow
$backendRunning = docker ps --format "{{.Names}}" | Select-String "rrf-backend"
$postgresRunning = docker ps --format "{{.Names}}" | Select-String "rrf-postgres"

if ($backendRunning) {
    Write-Host "  ✓ Backend container is running" -ForegroundColor Green
} else {
    Write-Host "  ✗ Backend container is NOT running" -ForegroundColor Red
    $issuesFound += "Backend container not running"
    $allGood = $false
}

if ($postgresRunning) {
    Write-Host "  ✓ PostgreSQL container is running" -ForegroundColor Green
} else {
    Write-Host "  ✗ PostgreSQL container is NOT running" -ForegroundColor Red
    $issuesFound += "PostgreSQL container not running"
    $allGood = $false
}

# Test 2: Check Database Has Records
Write-Host "`n[2/6] Checking database records..." -ForegroundColor Yellow
try {
    $recordCount = docker exec rrf-postgres psql -U postgres -d rrf_portal -t -c "SELECT COUNT(*) FROM rrfs;" 2>$null
    $recordCount = $recordCount.Trim()
    
    if ([int]$recordCount -gt 0) {
        Write-Host "  ✓ Found $recordCount RRF records in database" -ForegroundColor Green
        
        # Check status values
        Write-Host "`n  Status breakdown:" -ForegroundColor Cyan
        docker exec rrf-postgres psql -U postgres -d rrf_portal -c "SELECT status, COUNT(*) as count FROM rrfs GROUP BY status ORDER BY count DESC;"
        
    } else {
        Write-Host "  ✗ No RRF records found in database" -ForegroundColor Red
        Write-Host "    Run: curl -X POST http://localhost:4000/seed" -ForegroundColor Yellow
        $issuesFound += "No records in database - seed required"
        $allGood = $false
    }
} catch {
    Write-Host "  ✗ Could not query database" -ForegroundColor Red
    $issuesFound += "Database query failed: $_"
    $allGood = $false
}

# Test 3: Login and Get Token
Write-Host "`n[3/6] Testing authentication..." -ForegroundColor Yellow
try {
    $loginBody = @{
        userId = "admin001"
        password = "admin123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "http://localhost:4000/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $loginBody `
        -ErrorAction Stop

    $token = $loginResponse.access_token
    
    if ($token) {
        Write-Host "  ✓ Successfully authenticated as admin001" -ForegroundColor Green
        Write-Host "  Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    } else {
        Write-Host "  ✗ No token received" -ForegroundColor Red
        $issuesFound += "Authentication failed - no token"
        $allGood = $false
    }
} catch {
    Write-Host "  ✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    $issuesFound += "Login failed"
    $allGood = $false
}

# Test 4: Test Statistics API Directly
if ($token) {
    Write-Host "`n[4/6] Testing statistics API endpoint..." -ForegroundColor Yellow
    try {
        $statsResponse = Invoke-RestMethod -Uri "http://localhost:4000/rrf/statistics?all=true" `
            -Method GET `
            -Headers @{
                "Authorization" = "Bearer $token"
                "Content-Type" = "application/json"
            } `
            -ErrorAction Stop

        Write-Host "`n  API Response:" -ForegroundColor Cyan
        $statsResponse | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor White

        if ($statsResponse.success) {
            $total = $statsResponse.data.total
            $byStatus = $statsResponse.data.byStatus

            if ($total -gt 0) {
                Write-Host "`n  ✓ Statistics API returned $total total RRFs" -ForegroundColor Green
                Write-Host "    - Pending: $($byStatus.pending)" -ForegroundColor Gray
                Write-Host "    - Approved: $($byStatus.approved)" -ForegroundColor Gray
                Write-Host "    - Open for Hiring: $($byStatus.openForHiring)" -ForegroundColor Gray
                Write-Host "    - Closed: $($byStatus.closed)" -ForegroundColor Gray
            } else {
                Write-Host "`n  ⚠ API returns zero RRFs but database has records!" -ForegroundColor Yellow
                Write-Host "    This means status values in DB don't match enum values" -ForegroundColor Yellow
                $issuesFound += "Status value mismatch between DB and enum"
                $allGood = $false
            }
        } else {
            Write-Host "  ✗ API returned success=false" -ForegroundColor Red
            $issuesFound += "API returned failure"
            $allGood = $false
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  ✗ Statistics API failed: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($statusCode -eq 401) {
            Write-Host "    Reason: Unauthorized (token invalid)" -ForegroundColor Yellow
            $issuesFound += "401 Unauthorized - invalid token"
        } elseif ($statusCode -eq 403) {
            Write-Host "    Reason: Forbidden (missing RRF.READ permission)" -ForegroundColor Yellow
            $issuesFound += "403 Forbidden - missing permission"
        }
        
        $allGood = $false
    }
} else {
    Write-Host "`n[4/6] Skipping API test (no token)" -ForegroundColor Gray
}

# Test 5: Check Admin Permissions
Write-Host "`n[5/6] Checking admin permissions..." -ForegroundColor Yellow
try {
    $permQuery = @"
SELECT p."permissionCode" 
FROM users u
JOIN roles r ON u."roleId" = r.id
JOIN role_permissions rp ON r.id = rp."roleId"
JOIN permissions p ON rp."permissionId" = p.id
WHERE u."userId" = 'admin001' AND p."permissionCode" LIKE 'RRF%'
ORDER BY p."permissionCode";
"@

    $permissions = docker exec rrf-postgres psql -U postgres -d rrf_portal -t -c $permQuery 2>$null
    
    if ($permissions -match "RRF\.READ") {
        Write-Host "  ✓ Admin has RRF.READ permission" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Admin missing RRF.READ permission" -ForegroundColor Red
        Write-Host "    Run: curl -X POST http://localhost:4000/seed" -ForegroundColor Yellow
        $issuesFound += "Missing RRF.READ permission"
        $allGood = $false
    }
} catch {
    Write-Host "  ⚠ Could not verify permissions" -ForegroundColor Yellow
}

# Test 6: Identify Root Cause
Write-Host "`n[6/6] Root cause analysis..." -ForegroundColor Yellow

# Check for status mismatch
try {
    $distinctStatuses = docker exec rrf-postgres psql -U postgres -d rrf_portal -t -c "SELECT DISTINCT status FROM rrfs;" 2>$null
    $statusArray = $distinctStatuses -split "`n" | Where-Object { $_ -match '\S' } | ForEach-Object { $_.Trim() }
    
    Write-Host "`n  Database status values:" -ForegroundColor Cyan
    $statusArray | ForEach-Object { Write-Host "    - $_" -ForegroundColor White }
    
    # Check for wrong case
    $wrongCase = $statusArray | Where-Object { $_ -cmatch '[A-Z]' -and $_ -ne 'ON_HOLD' -and $_ -ne 'OPEN_FOR_HIRING' }
    
    if ($wrongCase.Count -gt 0) {
        Write-Host "`n  ✗ FOUND ISSUE: Status values have wrong case!" -ForegroundColor Red
        Write-Host "    Expected: lowercase (e.g., 'pending', 'approved')" -ForegroundColor Yellow
        Write-Host "    Found: $wrongCase" -ForegroundColor Yellow
        $issuesFound += "Status values have uppercase letters (should be lowercase)"
        $allGood = $false
        
        Write-Host "`n  💡 FIX: Run this SQL command:" -ForegroundColor Cyan
        Write-Host "    docker exec -it rrf-postgres psql -U postgres -d rrf_portal" -ForegroundColor White
        Write-Host "    UPDATE rrfs SET status = LOWER(status);" -ForegroundColor White
        Write-Host "    \q" -ForegroundColor White
    }
    
    # Check for enum mismatches
    $validStatuses = @('draft', 'pending', 'submitted', 'approved', 'declined', 'rejected', 'on-hold', 'in-progress', 'open-for-hiring', 'closed-by-bench', 'closed')
    $invalidStatuses = $statusArray | Where-Object { $_ -notin $validStatuses }
    
    if ($invalidStatuses.Count -gt 0) {
        Write-Host "`n  ✗ FOUND ISSUE: Invalid status values in database!" -ForegroundColor Red
        Write-Host "    Invalid: $invalidStatuses" -ForegroundColor Yellow
        Write-Host "    Valid: draft, pending, approved, in-progress, closed, etc." -ForegroundColor Yellow
        $issuesFound += "Invalid status values: $invalidStatuses"
        $allGood = $false
    }
    
} catch {
    Write-Host "  ⚠ Could not analyze status values" -ForegroundColor Yellow
}

# Final Summary
Write-Host "`n╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    DIAGNOSTIC SUMMARY                  ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "`n✅ All tests passed! Statistics should be working correctly." -ForegroundColor Green
    Write-Host "`nIf you still see zeros in the frontend:" -ForegroundColor Yellow
    Write-Host "  1. Clear browser cache (Ctrl+F5)" -ForegroundColor White
    Write-Host "  2. Clear localStorage: Open F12 console and run:" -ForegroundColor White
    Write-Host "     localStorage.clear(); window.location.reload();" -ForegroundColor Gray
    Write-Host "  3. Check browser Network tab for /rrf/statistics call" -ForegroundColor White
} else {
    Write-Host "`n❌ Found $($issuesFound.Count) issue(s):" -ForegroundColor Red
    $issuesFound | ForEach-Object { Write-Host "  • $_" -ForegroundColor Yellow }
    
    Write-Host "`n📋 Recommended Actions:" -ForegroundColor Cyan
    
    if ($issuesFound -match "No records") {
        Write-Host "  1. Seed the database:" -ForegroundColor White
        Write-Host "     curl -X POST http://localhost:4000/seed" -ForegroundColor Gray
    }
    
    if ($issuesFound -match "Status value|wrong case|uppercase") {
        Write-Host "  2. Fix status values in database:" -ForegroundColor White
        Write-Host "     docker exec -it rrf-postgres psql -U postgres -d rrf_portal" -ForegroundColor Gray
        Write-Host "     UPDATE rrfs SET status = LOWER(status);" -ForegroundColor Gray
        Write-Host "     \q" -ForegroundColor Gray
    }
    
    if ($issuesFound -match "permission") {
        Write-Host "  3. Re-seed permissions:" -ForegroundColor White
        Write-Host "     curl -X POST http://localhost:4000/seed" -ForegroundColor Gray
    }
    
    if ($issuesFound -match "container not running") {
        Write-Host "  4. Start containers:" -ForegroundColor White
        Write-Host "     docker-compose up -d" -ForegroundColor Gray
    }
}

Write-Host "`n" -NoNewline
