# API Connection Test Guide

## ✅ Backend Status: RUNNING

Your backend is now running at: http://localhost:4000

## Common Issues & Solutions

### Issue 1: "Failed to fetch" Error
**Cause:** Backend server was not running  
**Solution:** ✅ FIXED - Backend is now running

### Issue 2: "Not authenticated. Please log in."
**Cause:** No authentication token in browser  
**Solution:** Log in to the portal

### How to Test:

1. **Open Browser Console** (Press F12)
2. **Go to:** http://localhost:3000/login
3. **Login with test credentials:**
   - User ID: `hm001`
   - Password: `hm123` ✅ (Updated)
4. **After login, navigate to:** http://localhost:3000/hiring-manager/my-requests
5. **Check Console for logs:**
   - `[API] Calling: http://localhost:4000/rrf/my-requests`
   - `[API] Response status: 200`
   - `[useMyRequests] Formatted data: [...]`

### Test Credentials

| Role | User ID | Password | Description |
|------|---------|----------|-------------|
| Hiring Manager | hm001 | hm123 | Has 2 RRFs (RRF-001, RRF-003) |
| Hiring Manager | hm002 | hm123 | Has 3 RRFs (RRF-002, RRF-004, RRF-005) |
| Approver | app001 | app123 | Can approve RRFs |
| PMO | pmo001 | pmo123 | Can verify and manage all RRFs |
| HR | hr001 | hr123 | Can close RRFs |
| Admin | admin001 | admin123 | Full system access |

### Debug Your Issue:

Open browser console and look for:

**Connection Issues:**
```
[API] Request failed: Failed to fetch
→ Backend not running (run: docker-compose up -d)
```

**Authentication Issues:**
```
[useMyRequests] Error: Not authenticated. Please log in.
→ Go to /login and log in with test credentials
```

**API Errors:**
```
[API] Response status: 401
→ Token expired, will redirect to /login automatically
```

```
[API] Response status: 403
→ User doesn't have permission to access this resource
```

### Quick Test from Command Line:

**1. Test Login API:**
```powershell
$body = @{
    userId = "hm001"
    password = "hm123"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri http://localhost:4000/auth/login `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing

$data = $response.Content | ConvertFrom-Json
Write-Host "Token: $($data.access_token)"
```

**2. Test My Requests API (replace YOUR_TOKEN):**
```powershell
$token = "YOUR_TOKEN_FROM_LOGIN"

Invoke-WebRequest -Uri http://localhost:4000/rrf/my-requests `
    -Method GET `
    -Headers @{Authorization = "Bearer $token"} `
    -UseBasicParsing | ConvertFrom-Json
```

## Next Steps:

1. ✅ Backend is running
2. ⏳ Log in at http://localhost:3000/login with `hm001` / `password123`
3. ⏳ Navigate to My Requests page
4. ⏳ Check browser console for logs

If you still see errors after logging in, please share the console logs (F12 → Console tab).
