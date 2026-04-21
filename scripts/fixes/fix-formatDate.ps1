# Quick Fix for formatDate Error
# This script clears cache and restarts the development server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "formatDate Error - Quick Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend directory
Set-Location rrf-portal-nextjs

# Step 1: Stop any running dev servers
Write-Host "Step 1: Stopping any running development servers..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "   ✓ Stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Clear Next.js cache
Write-Host "Step 2: Clearing Next.js cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Write-Host "   ✓ Deleted .next folder" -ForegroundColor Green
} else {
    Write-Host "   ✓ No .next folder found (already clean)" -ForegroundColor Green
}
Write-Host ""

# Step 3: Clear node_modules/.cache
Write-Host "Step 3: Clearing node cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "   ✓ Deleted node_modules/.cache" -ForegroundColor Green
} else {
    Write-Host "   ✓ No cache folder found" -ForegroundColor Green
}
Write-Host ""

# Step 4: Verify utility file exists
Write-Host "Step 4: Verifying dateFormatter.js exists..." -ForegroundColor Yellow
if (Test-Path "utils\dateFormatter.js") {
    Write-Host "   ✓ utils/dateFormatter.js exists" -ForegroundColor Green
} else {
    Write-Host "   ✗ utils/dateFormatter.js NOT FOUND!" -ForegroundColor Red
    Write-Host "   Creating it now..." -ForegroundColor Yellow
    
    # Create utils directory if it doesn't exist
    if (-not (Test-Path "utils")) {
        New-Item -Path "utils" -ItemType Directory | Out-Null
    }
    
    # Create dateFormatter.js
    $content = @'
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
'@
    
    Set-Content -Path "utils\dateFormatter.js" -Value $content
    Write-Host "   ✓ Created utils/dateFormatter.js" -ForegroundColor Green
}
Write-Host ""

# Step 5: Start development server
Write-Host "Step 5: Starting development server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting 'npm run dev'..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start the dev server
npm run dev
