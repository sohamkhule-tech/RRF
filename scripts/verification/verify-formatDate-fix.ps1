# Verify formatDate Import Fix
# Run this script to check if all formatDate imports are correct

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verifying formatDate Import Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if utility file exists
Write-Host "1. Checking if dateFormatter.js exists..." -ForegroundColor Yellow
$utilityPath = "rrf-portal-nextjs\utils\dateFormatter.js"
if (Test-Path $utilityPath) {
    Write-Host "   ✓ File exists: $utilityPath" -ForegroundColor Green
    
    # Check if it has proper exports
    $content = Get-Content $utilityPath -Raw
    if ($content -match "export const formatDate") {
        Write-Host "   ✓ formatDate is exported" -ForegroundColor Green
    } else {
        Write-Host "   ✗ formatDate export not found!" -ForegroundColor Red
    }
} else {
    Write-Host "   ✗ File NOT found: $utilityPath" -ForegroundColor Red
    Write-Host "   Creating utility file..." -ForegroundColor Yellow
    
    $utilityContent = @"
/**
 * Date Formatting Utilities
 */

export const formatDate = (date, fallback = 'N/A') => {
  if (!date) return fallback

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return fallback
    }

    const day = String(dateObj.getDate()).padStart(2, '0')
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const year = dateObj.getFullYear()

    return `${day}-${month}-${year}`
  } catch (error) {
    console.error('Error formatting date:', error)
    return fallback
  }
}

export const formatDateTime = (date, fallback = 'N/A') => {
  if (!date) return fallback

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return fallback
    }

    const day = String(dateObj.getDate()).padStart(2, '0')
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const year = dateObj.getFullYear()
    const hours = String(dateObj.getHours()).padStart(2, '0')
    const minutes = String(dateObj.getMinutes()).padStart(2, '0')

    return `${day}-${month}-${year}, ${hours}:${minutes}`
  } catch (error) {
    console.error('Error formatting datetime:', error)
    return fallback
  }
}
"@
    
    New-Item -Path "rrf-portal-nextjs\utils" -ItemType Directory -Force | Out-Null
    Set-Content -Path $utilityPath -Value $utilityContent
    Write-Host "   ✓ Created $utilityPath" -ForegroundColor Green
}

Write-Host ""

# 2. Check jsconfig.json
Write-Host "2. Checking jsconfig.json configuration..." -ForegroundColor Yellow
$jsconfigPath = "rrf-portal-nextjs\jsconfig.json"
if (Test-Path $jsconfigPath) {
    $jsconfig = Get-Content $jsconfigPath -Raw
    if ($jsconfig -match '"@/\*"') {
        Write-Host "   ✓ '@/*' alias is configured" -ForegroundColor Green
    } else {
        Write-Host "   ✗ '@/*' alias NOT configured" -ForegroundColor Red
    }
} else {
    Write-Host "   ✗ jsconfig.json not found" -ForegroundColor Red
}

Write-Host ""

# 3. Count files with formatDate import
Write-Host "3. Checking files importing formatDate..." -ForegroundColor Yellow
$importPattern = "from '@/utils/dateFormatter'"
$filesWithImport = Get-ChildItem -Path "rrf-portal-nextjs\app" -Recurse -Include "*.jsx","*.js" | 
                   Select-String -Pattern $importPattern | 
                   Select-Object -ExpandProperty Path -Unique

if ($filesWithImport) {
    Write-Host "   ✓ Found $($filesWithImport.Count) files with correct import" -ForegroundColor Green
    foreach ($file in $filesWithImport) {
        $relativePath = $file -replace [regex]::Escape((Get-Location).Path + "\"), ""
        Write-Host "      - $relativePath" -ForegroundColor Gray
    }
} else {
    Write-Host "   ✗ No files found with '@/utils/dateFormatter' import" -ForegroundColor Red
}

Write-Host ""

# 4. Check for local formatDate definitions (should be removed)
Write-Host "4. Checking for local formatDate definitions..." -ForegroundColor Yellow
$localDefPattern = "(const|function)\s+formatDate\s*="
$filesWithLocal = Get-ChildItem -Path "rrf-portal-nextjs\app" -Recurse -Include "*.jsx","*.js" | 
                  Select-String -Pattern $localDefPattern | 
                  Select-Object -ExpandProperty Path -Unique

if ($filesWithLocal) {
    Write-Host "   ⚠ Found $($filesWithLocal.Count) files with LOCAL formatDate (should be removed)" -ForegroundColor Yellow
    foreach ($file in $filesWithLocal) {
        $relativePath = $file -replace [regex]::Escape((Get-Location).Path + "\"), ""
        Write-Host "      - $relativePath" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✓ No local formatDate definitions found" -ForegroundColor Green
}

Write-Host ""

# 5. Summary and Next Steps
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Stop the development server (Ctrl+C)" -ForegroundColor White
Write-Host "2. Clear Next.js cache:" -ForegroundColor White
Write-Host "   cd rrf-portal-nextjs" -ForegroundColor Gray
Write-Host "   Remove-Item -Recurse -Force .next" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Restart the development server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Clear browser cache (Ctrl+Shift+R)" -ForegroundColor White
Write-Host ""
Write-Host "5. Test login for each role:" -ForegroundColor White
Write-Host "   - Hiring Manager" -ForegroundColor Gray
Write-Host "   - Approver" -ForegroundColor Gray
Write-Host "   - HR" -ForegroundColor Gray
Write-Host "   - PMO" -ForegroundColor Gray
Write-Host ""
Write-Host "If errors persist, check browser console (F12)" -ForegroundColor Yellow
Write-Host ""
