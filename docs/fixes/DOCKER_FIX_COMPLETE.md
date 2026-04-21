# Docker Configuration Fix - Complete Guide

## 🔴 Problem Identified

Your Docker setup had **TWO CRITICAL ISSUES** causing stale code:

### Issue 1: Volume Override in docker-compose.yml
```yaml
# ❌ OLD - This was OVERRIDING your built code!
volumes:
  - ./rrf-portal-nextjs:/app  # ← Host folder overrides container
  - /app/node_modules
  - /app/.next
```

**Impact:** Even after rebuilding, Docker served OLD CODE from your host machine instead of the freshly built code inside the container.

### Issue 2: Development Dockerfile in Production
```dockerfile
# ❌ OLD - Development mode doesn't build .next
CMD ["npm", "run", "dev"]
```

**Impact:** Next.js dev server doesn't create optimized production builds, leading to scope issues with imports.

---

## ✅ Solutions Applied

### 1. Updated Production Dockerfile
**File:** `rrf-portal-nextjs/Dockerfile`

```dockerfile
# ✅ NEW - Production build with cache cleanup
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .

# CRITICAL: Remove stale .next cache before building
RUN rm -rf .next

# Build for production (creates optimized .next folder)
RUN npm run build

EXPOSE 3000

# Start production server
CMD ["npm", "start"]
```

**Benefits:**
- ✅ Explicitly cleans `.next` before build
- ✅ Uses production build (`npm run build`)
- ✅ Serves optimized bundle (`npm start`)
- ✅ No scope issues with imports

### 2. Fixed docker-compose.yml (Production)
**File:** `docker-compose.yml`

```yaml
# ✅ NEW - No volume override
frontend:
  build:
    context: ./rrf-portal-nextjs
    dockerfile: Dockerfile
  ports:
    - "3000:3000"
  # NO VOLUMES - container uses its own built code
  environment:
    - NEXT_PUBLIC_API_URL=http://localhost:4000
```

**Benefits:**
- ✅ Container uses its own built `.next` folder
- ✅ No risk of host files overriding container code
- ✅ Consistent behavior across environments
- ✅ True production deployment

### 3. Created Separate Dev Configuration (Optional)
**File:** `docker-compose.dev.yml`

For developers who need hot reload during active development:

```bash
# Use dev mode with hot reload
docker-compose -f docker-compose.dev.yml up
```

This uses `Dockerfile.dev` with volume mounting enabled.

---

## 🚀 Quick Start Guide

### Production Mode (Recommended for Testing)

Use this to test your formatDate fixes:

```powershell
# 1. Full rebuild (removes all cache)
.\rebuild-docker.ps1

# 2. Wait for "compiled successfully" in logs

# 3. Verify code inside container
.\verify-container-code.ps1

# 4. Open browser
# http://localhost:3000
```

### Development Mode (For Active Coding)

Use this only when actively making code changes:

```powershell
# Stop production containers
docker-compose down

# Start dev mode with hot reload
docker-compose -f docker-compose.dev.yml up
```

**Note:** Dev mode uses volume mounting, so file changes reflect immediately without rebuild.

---

## 📋 File Summary

### Created Files
1. **rebuild-docker.ps1** (Updated)
   - Now cleans host `.next` folder too
   - Full Docker cache removal
   - Production build with `--no-cache`

2. **verify-container-code.ps1** (New)
   - Verifies container has latest code
   - Checks for old formatDate imports
   - Detects volume override issues

3. **docker-compose.dev.yml** (New)
   - Development mode with hot reload
   - Volume mounting enabled
   - Only use during active development

4. **rrf-portal-nextjs/Dockerfile.dev** (New)
   - Development Dockerfile
   - Supports hot reload
   - Used by docker-compose.dev.yml

### Modified Files
1. **rrf-portal-nextjs/Dockerfile**
   - ✅ Added `.next` cleanup step
   - ✅ Production build command
   - ✅ Production start command

2. **docker-compose.yml**
   - ✅ Removed volume override
   - ✅ Removed polling environment variables
   - ✅ Clean production configuration

---

## 🔍 Verification Steps

### Step 1: Run Rebuild Script
```powershell
.\rebuild-docker.ps1
```

**Expected output:**
```
[1/5] Stopping all running containers...
✓ Containers stopped

[2/5] Removing ALL Docker cache...
✓ Docker cache cleared

[2.5/5] Cleaning host .next build cache...
✓ Host .next folder removed

[3/5] Rebuilding Docker images from scratch...
✓ Images rebuilt successfully

[4/5] Starting containers...
✓ Containers started

[5/5] Displaying frontend logs...
```

### Step 2: Verify Container Code
```powershell
.\verify-container-code.ps1
```

**Expected output:**
```
[Test 1] Checking for old formatDate imports...
✓ PASS: No old formatDate imports found

[Test 2] Checking for native Date() usage...
✓ PASS: Native JavaScript date formatting found

[Test 3] Checking if production build exists...
✓ PASS: .next build folder exists

[Test 4] Checking container start command...
✓ PASS: Using production start command

[Test 5] Checking for problematic volume mounts...
✓ PASS: No volume override detected
```

### Step 3: Browser Testing
1. Open http://localhost:3000
2. Press **F12** to open console
3. Login as Hiring Manager
4. Navigate to Dashboard

**Expected results:**
- ✅ NO "formatDate is not defined" errors
- ✅ Dates display as DD-MM-YYYY (e.g., "16-04-2026")
- ✅ Page loads without crashes
- ✅ All roles work correctly

---

## 🛠️ Troubleshooting

### Issue: formatDate errors still appear

**Cause:** Docker is using cached layers despite `--no-cache`

**Solution:**
```powershell
# Nuclear option - remove EVERYTHING
docker-compose down
docker system prune -a -f --volumes
docker volume prune -f

# Verify images are gone
docker images | grep rrf
# Should return: nothing

# Rebuild
docker-compose build --no-cache
docker-compose up
```

### Issue: Container exits immediately

**Cause:** Next.js build failed or missing dependencies

**Solution:**
```powershell
# Check container logs
docker-compose logs frontend

# Common fixes:
# 1. Delete node_modules and package-lock.json on host
Remove-Item -Recurse -Force rrf-portal-nextjs\node_modules
Remove-Item -Force rrf-portal-nextjs\package-lock.json

# 2. Rebuild
.\rebuild-docker.ps1
```

### Issue: Verification script shows volume mount warning

**Cause:** Using docker-compose.dev.yml instead of docker-compose.yml

**Solution:**
```powershell
# Switch to production mode
docker-compose -f docker-compose.dev.yml down
docker-compose up -d
```

### Issue: Changes not reflecting in container

**Cause 1:** Not rebuilding after code changes

**Solution:**
```powershell
# After changing code, always rebuild in production mode
docker-compose down
docker-compose build --no-cache
docker-compose up
```

**Cause 2:** Using wrong docker-compose file

**Solution:**
```powershell
# Check which containers are running
docker ps

# If using dev containers (hot reload), changes reflect immediately
# If using production containers, need to rebuild
```

---

## 🎯 Best Practices

### For Testing/Production
1. Always use **docker-compose.yml** (no volumes)
2. Rebuild with `--no-cache` after code changes
3. Run verification script before testing
4. Clear browser cache between deployments

### For Active Development
1. Use **docker-compose.dev.yml** for hot reload
2. Changes reflect immediately without rebuild
3. Switch to production mode for final testing
4. Remember: dev mode != production mode

### General Rules
1. **Never rely on docker-compose up after code changes**
   - Always rebuild: `docker-compose build --no-cache`

2. **When in doubt, verify:**
   ```powershell
   .\verify-container-code.ps1
   ```

3. **Clear everything if stuck:**
   ```powershell
   docker-compose down
   docker system prune -a -f
   ```

---

## 📊 Configuration Comparison

| Aspect | Production (docker-compose.yml) | Development (docker-compose.dev.yml) |
|--------|--------------------------------|-------------------------------------|
| **Dockerfile** | Dockerfile (production build) | Dockerfile.dev (dev server) |
| **Volume Mounting** | ❌ Disabled | ✅ Enabled |
| **Hot Reload** | ❌ No | ✅ Yes |
| **Build Command** | npm run build | - |
| **Start Command** | npm start | npm run dev |
| **Code Source** | Container's .next build | Host machine files |
| **Rebuild Required** | ✅ After every change | ❌ Changes auto-reload |
| **Use Case** | Testing, QA, Production | Active development |

---

## ✅ Success Checklist

After running `.\rebuild-docker.ps1`:

- [ ] Script completed all 5 steps without errors
- [ ] "compiled successfully" appears in logs
- [ ] `.\verify-container-code.ps1` shows all PASS
- [ ] Browser console shows NO formatDate errors
- [ ] Dates display in DD-MM-YYYY format
- [ ] All roles load correctly (HM, Approver, HR, PMO)
- [ ] CSV export works with correct dates

---

## 🔄 Quick Reference Commands

```powershell
# Full rebuild (use this 90% of the time)
.\rebuild-docker.ps1

# Verify container has latest code
.\verify-container-code.ps1

# View logs
docker-compose logs -f frontend

# Restart containers only (no rebuild)
docker-compose restart

# Stop everything
docker-compose down

# Check running containers
docker ps

# Access container shell
docker exec -it rrf-frontend sh

# Nuclear option (clean everything)
docker-compose down
docker system prune -a -f --volumes
docker-compose build --no-cache
docker-compose up
```

---

**Last Updated:** April 16, 2026  
**Status:** Docker configuration optimized for production builds + stale code eliminated
