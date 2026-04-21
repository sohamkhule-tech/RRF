# API Connection Fix & Docker Networking Guide

## 🔴 Issue Fixed

**Problem:** `formConfig.js` was using port **3001** instead of **4000**

**Fix Applied:**
```javascript
// ✅ CORRECTED (Line 1 of formConfig.js)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
```

---

## 📋 Understanding Docker Networking in Next.js

### **Key Concept:**

Next.js API calls happen in **TWO PLACES**:

1. **Client-Side (Browser)** 
   - Browser runs on YOUR COMPUTER (host machine)
   - Uses: `http://localhost:4000` ✅
   - This is correct!

2. **Server-Side (SSR/SSG during build)**
   - Runs inside Docker container
   - Would need: `http://backend:4000` (for container-to-container)
   - Your app uses client-side only, so not needed

### **Your Current Setup (Correct):**

```yaml
# docker-compose.yml
backend:
  ports:
    - "4000:4000"  # Exposes backend to host machine
  
frontend:
  ports:
    - "3000:3000"  # Exposes frontend to host machine
  environment:
    - NEXT_PUBLIC_API_URL=http://localhost:4000  # ✅ Browser uses this
```

**Why it works:**
- Docker exposes backend port 4000 to host machine
- Browser (on host) can access `localhost:4000`
- Frontend container doesn't need to know backend's internal name

---

## 🚀 Rebuild Frontend to Apply Fix

Since you're using production mode (no volume mount), you need to rebuild:

```powershell
# Stop all containers
docker-compose down

# Rebuild only frontend (faster)
docker-compose build --no-cache frontend

# Start all services
docker-compose up -d

# Watch logs
docker-compose logs -f frontend
```

**Or use the full rebuild script:**
```powershell
.\rebuild-docker.ps1
```

---

## 🔍 Debugging Commands

### **1. Check Container Status**
```powershell
# See all running containers
docker ps

# Expected output:
# rrf-frontend   Up X minutes   0.0.0.0:3000->3000/tcp
# rrf-backend    Up X minutes   0.0.0.0:4000->4000/tcp
# rrf-postgres   Up X minutes   0.0.0.0:5432->5432/tcp
```

### **2. Check Backend is Running**
```powershell
# View backend logs
docker logs rrf-backend --tail 50

# Expected: "🚀 RRF Portal Backend API running on http://localhost:4000"
```

### **3. Test Backend from Host Machine**
```powershell
# Test health endpoint (if exists)
curl http://localhost:4000

# Test login endpoint
curl -X POST http://localhost:4000/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"test123"}'

# Test form-config endpoint (requires auth token)
curl http://localhost:4000/rrf/form-config `
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### **4. Test Backend from Inside Frontend Container**
```powershell
# Access frontend container
docker exec -it rrf-frontend sh

# Test if backend is reachable (using container name)
wget -O- http://backend:4000 2>&1 | head -20

# Test using localhost (should also work due to port mapping)
wget -O- http://localhost:4000 2>&1 | head -20

# Exit container
exit
```

### **5. Check Network Configuration**
```powershell
# List Docker networks
docker network ls

# Inspect your app's network
docker network inspect rrf_2_rrf-network

# Should show all 3 containers connected
```

### **6. Verify API URL in Running Container**
```powershell
# Check the actual code inside container
docker exec rrf-frontend sh -c "cat lib/api/formConfig.js | head -5"

# Should show: http://localhost:4000 (not 3001)
```

### **7. Test API Calls from Browser Console**
```javascript
// Open browser console (F12) at http://localhost:3000
// Test form-config endpoint
fetch('http://localhost:4000/rrf/form-config', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
  .then(r => r.json())
  .then(d => console.log('✅ Success:', d))
  .catch(e => console.error('❌ Error:', e));
```

---

## 🐛 Common Issues & Solutions

### **Issue 1: ERR_CONNECTION_REFUSED**

**Cause:** Backend not running or wrong port

**Debug:**
```powershell
# Check if backend container is running
docker ps | findstr backend

# Check backend logs for errors
docker logs rrf-backend

# Restart backend
docker-compose restart backend
```

### **Issue 2: CORS Error**

**Cause:** Backend not allowing frontend origin

**Check backend environment:**
```powershell
docker exec rrf-backend printenv | findstr ALLOWED_ORIGINS

# Should show: ALLOWED_ORIGINS=http://localhost:3000
```

**If wrong, update docker-compose.yml:**
```yaml
backend:
  environment:
    - ALLOWED_ORIGINS=http://localhost:3000
```

### **Issue 3: 401 Unauthorized**

**Cause:** Missing or invalid auth token

**Debug:**
```javascript
// In browser console (F12)
console.log('Token:', localStorage.getItem('token'));

// If null, you need to login first
```

### **Issue 4: Port Already in Use**

**Cause:** Another process using port 3000 or 4000

**Fix:**
```powershell
# Find what's using port 4000
netstat -ano | findstr :4000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Then restart containers
docker-compose up -d
```

### **Issue 5: Stale Code in Container**

**Cause:** Docker serving old cached build

**Fix:**
```powershell
# Nuclear option - clean everything
docker-compose down
docker system prune -a -f
Remove-Item -Recurse -Force rrf-portal-nextjs\.next

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

---

## ✅ Verification Checklist

After rebuilding, verify:

- [ ] All 3 containers running: `docker ps`
- [ ] Backend accessible: `curl http://localhost:4000`
- [ ] Frontend accessible: Open `http://localhost:3000`
- [ ] No console errors in browser (F12)
- [ ] API calls succeed (check Network tab in F12)
- [ ] formConfig.js uses port 4000: `docker exec rrf-frontend cat lib/api/formConfig.js | head -1`

---

## 🎯 Updated API Call Pattern

All your API calls should now work with this pattern:

```javascript
// ✅ CORRECT - Uses NEXT_PUBLIC_API_URL from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Example API call
export async function fetchData() {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}/rrf/your-endpoint`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  
  return response.json();
}
```

---

## 📝 Summary

**What Was Wrong:**
- `formConfig.js` had hardcoded `localhost:3001` ❌
- Backend actually runs on `localhost:4000` ✅

**What We Fixed:**
- Changed `formConfig.js` to use port `4000`
- Now matches `apiConfig.js` and `docker-compose.yml`

**Next Steps:**
1. Rebuild frontend container
2. Test API calls in browser
3. Verify no ERR_CONNECTION_REFUSED errors

---

**Last Updated:** April 16, 2026  
**Status:** Fix applied - Requires frontend rebuild
