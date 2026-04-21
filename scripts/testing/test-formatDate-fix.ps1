# formatDate Scope Fix - Quick Test
# Run this to verify the fix is working

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing formatDate Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check the fixed files
$filesToCheck = @(
    "rrf-portal-nextjs\app\hiring-manager\dashboard\page.jsx",
    "rrf-portal-nextjs\app\hiring-manager\view-rrf\[id]\page.jsx"
)

foreach ($file in $filesToCheck) {
    Write-Host "Checking: $file" -ForegroundColor Yellow
    
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Check for safe import
        if ($content -match "formatDate as formatDateUtil") {
            Write-Host "  ✓ Safe import found (renamed to formatDateUtil)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Safe import NOT found" -ForegroundColor Red
        }
        
        # Check for useCallback wrapper
        if ($content -match "const formatDate = useCallback") {
            Write-Host "  ✓ useCallback wrapper found" -ForegroundColor Green
        } else {
            Write-Host "  ✗ useCallback wrapper NOT found" -ForegroundColor Red
        }
        
        # Check for fallback
        if ($content -match "toLocaleDateString\('en-GB'\)") {
            Write-Host "  ✓ Fallback to native date formatting found" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ No fallback found" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "  ✗ File not found!" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Clear Next.js cache:" -ForegroundColor White
Write-Host "   cd rrf-portal-nextjs" -ForegroundColor Gray
Write-Host "   Remove-Item -Recurse -Force .next" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Restart dev server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test Hiring Manager login:" -ForegroundColor White
Write-Host "   - Go to dashboard" -ForegroundColor Gray
Write-Host "   - Check browser console (F12)" -ForegroundColor Gray
Write-Host "   - Should see NO 'formatDate is not defined' errors" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Check dates display correctly:" -ForegroundColor White
Write-Host "   - View RRF list" -ForegroundColor Gray
Write-Host "   - View RRF details" -ForegroundColor Gray
Write-Host "   - Export CSV" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "What Was Fixed?" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PROBLEM:" -ForegroundColor Red
Write-Host "  formatDate was imported but not accessible in .map() callbacks" -ForegroundColor Gray
Write-Host ""
Write-Host "SOLUTION:" -ForegroundColor Green
Write-Host "  1. Renamed import to formatDateUtil" -ForegroundColor Gray
Write-Host "  2. Created local formatDate using useCallback" -ForegroundColor Gray
Write-Host "  3. Added try-catch with native fallback" -ForegroundColor Gray
Write-Host "  4. Ensured stable function reference across re-renders" -ForegroundColor Gray
Write-Host ""
Write-Host "This ensures formatDate is ALWAYS available in all scopes!" -ForegroundColor Green
Write-Host ""
