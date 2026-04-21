# 🔥 Docker Hot Reload Setup - Complete Guide

## ✅ Current Status
Your Docker setup is **fully configured** for hot reload! All components are in place:

- ✅ `docker-compose.dev.yml` - Development configuration with hot reload
- ✅ `Dockerfile.dev` - Development Dockerfile running `npm run dev`
- ✅ `next.config.js` - Webpack polling configured (dev mode only)
- ✅ Volume mounting - Bidirectional code sync enabled
- ✅ Environment variables - CHOKIDAR_USEPOLLING & WATCHPACK_POLLING set
- ✅ **Shared database volume** - Same database for dev and production (no data loss!)

---

## 🚀 Quick Start

### **EASIEST METHOD: Use Helper Scripts** ⭐

```powershell
# Switch to development mode (hot reload enabled)
.\start-dev-mode.ps1

# Test that hot reload is working
.\test-hot-reload.ps1

# Switch back to production mode
.\start-prod-mode.ps1
```

### Option 1: Development Mode (Hot Reload) - **RECOMMENDED FOR DEVELOPMENT**
**Uses SAME database as production** (`postgres_data` volume)
- ✅ **Zero data loss** when switching between modes
```powershell
# Start with hot reload enabled
docker-compose -f docker-compose.dev.yml up --build

# Or in detached mode
docker-compose -f docker-compose.dev.yml up -d --build
```

**What this does:**
- ✅ Runs frontend in development mode (`npm run dev`)
- ✅ Enables instant hot reload on file changes
- ✅ Mounts your local code into container
- ✅ Preserves existing database data (uses separate volume `postgres_data_dev`)
- ✅ Uses separate containers (`*-dev` suffix) to avoid conflicts

### Option 2: Production Mode - **FOR TESTING PRODUCTION BUILD**

```powershell
# Start without hot reload (optimized production build)
docker-compose up --build

# Or in detached mode
docker-compose up -d --build
```

**What this does:**
- ✅ Builds optimized production bundle
- ✅ Serves static files efficiently
- ✅ No volume mounting (uses built .next folder)
- ✅ Uses main database volume `postgres_data`

---

## 📋 Stopping Services

### Stop Development Environment
```powershell
# Stop and remove containers (keeps volumes/data)
docker-compose -f docker-compose.dev.yml down

# View logs if needed
docker-compose -f docker-compose.dev.yml logs -f frontend
```

### Stop Production Environment
```powershell
docker-compose down
```

---

## 🔍 How Hot Reload Works

### Development Setup (docker-compose.dev.yml):

1. **Frontend Service Configuration:**
   ```yaml
   frontend:
     build:
       dockerfile: Dockerfile.dev  # Uses dev Dockerfile
     volumes:
       - ./rrf-portal-nextjs:/app      # Your code → container
       - /app/node_modules              # Preserve container's node_modules
       - /app/.next                     # Preserve build cache
     environment:
       - CHOKIDAR_USEPOLLING=true      # File watcher polling
       - WATCHPACK_POLLING=true         # Webpack polling
   ```

2. **Dockerfile.dev:**
   ```dockerfile
   CMD ["npm", "run", "dev"]  # Development server with hot reload
   ```

3. **next.config.js (already configured):**
   ```javascript
   webpack: (config) => {
     config.watchOptions = {
       poll: 1000,              // Check for changes every 1 second
       aggregateTimeout: 300,   // Delay before rebuilding
     }
     return config
   }
   ```

### Result:
When you edit a file in `rrf-portal-nextjs/`:
1. ✅ Change detected instantly (via polling)
2. ✅ Next.js re-compiles automatically
3. ✅ Browser refreshes within 1-2 seconds
4. ✅ No manual rebuild needed!

---

## 🎯 Testing Hot Reload

### Step 1: Start Development Mode
```powershell
docker-compose -f docker-compose.dev.yml up
```

### Step 2: Make a Change
Edit any file, for example:
- `rrf-portal-nextjs/app/page.jsx`
- Change some text or add a component

### Step 3: Verify
1. Watch terminal output - you'll see:
   ```
   Compiled in XXXms
   ```
2. Refresh browser (or wait for auto-refresh)
3. Changes appear immediately! ✅

---

## ⚠️ Important Notes

### Both dev and production** use the **SAME** `postgres_data` volume
- ✅ **Zero data loss** when switching between modes
- ✅ All your data is preserved automatically
- ✅ No manual migration needed
- ✅ **Both are preserved** - no data loss when switching

### Container Names
- Development: `rrf-frontend-dev`, `rrf-backend-dev`, `rrf-postgres-dev`
- Production: `rrf-frontend`, `rrf-backend`, `rrf-postgres`
- ✅ **No conflicts** - can run both simultaneously (but use different ports if needed)

### Node Modules
- Volume exclusion `/app/node_modules` prevents conflicts
- Container uses its own dependencies
- ✅ Host and container node_modules stay separate

### .next Folder
- Volume exclusion `/app/.next` in dev mode
- Each environment has its own build cache
- ✅ No interference between dev and production builds

---

## 🔧 Troubleshooting

### Hot Reload Not Working?

1. **Verify you're using dev compose:**
   ```powershell
   docker-compose -f docker-compose.dev.yml ps
   ```
   Should show `rrf-frontend-dev` (not `rrf-frontend`)

2. **Check logs:**
   ```powershell
   docker-compose -f docker-compose.dev.yml logs -f frontend
   ```
   Should show: `started server on 0.0.0.0:3000, url: http://localhost:3000`

3. **Rebuild if needed:**
   ```powershell
   docker-compose -f docker-compose.dev.yml down
   docker-compose -f docker-compose.dev.yml up --build
   ```

4. **Clear Next.js cache (if stale):**
   ```powershell
   # Remove .next from your local machine
   Remove-Item -Recurse -Force .\rrf-portal-nextjs\.next
   
   # Restart containers
   docker-compose -f docker-compose.dev.yml restart frontend
   ```

### Port Already in Use?

```powershell
# Stop all containers first
docker-compose down
docker-compose -f docker-compose.dev.yml down

# Then start only what you need
docker-compose -f docker-compose.dev.yml up
```

### Changes Not Reflecting?

1. **Hard refresh browser:** `Ctrl + Shift + R`
2. **Check file is saved**
3. **Watch terminal for compilation messages**
4. **Verify volume mounting:**
   ```powershell
   docker exec -it rrf-frontend-dev ls -la /app
   # Should show your source files
   ```

---

## 📊 Performance Comparison

| Feature | Production Mode | Development Mode |
|---------|----------------|------------------|
| Build Time | 2-3 minutes | 30-60 seconds |
| Startup Time | Fast | Fast |
| Hot Reload | ❌ No | ✅ Yes |
| Code Changes | Requires rebuild | Instant |
| Bundle Size | Optimized | Larger (dev) |
| Use Case | Testing/Deployment | Active Development |

---

## 🎨 Recommended Workflow

### Daily Development:
```powershell
# Morning - Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Code all day with instant hot reload ✅

# Evening - Stop containers (keeps data)
docker-compose -f docker-compose.dev.yml down
```

### Before Deployment:
```powershell
# Test production build
docker-compose up --build

# Verify everything works
# If good, deploy to production server
```

---

## ✅ Configuration Files Reference

Your setup includes these files:

1. **docker-compose.dev.yml** - Development with hot reload
2. **docker-compose.yml** - Production build
3. **Dockerfile.dev** - Development container (npm run dev)
4. **Dockerfile** - Production container (npm run build + start)
5. **next.config.js** - Webpack polling (already configured)

All files are properly configured and ready to use!

---

## 🚀 Summary

**For Hot Reload Development:**
```powershell
docker-compose -f docker-compose.dev.yml up
```

**For Production Testing:**
```powershell
docker-compose up
```

**Your data is always safe!** ✅
- Database volumes preserved
- No data loss when switching modes
- Separate containers prevent conflicts

---

## 💡 Pro Tips

1. **Use aliases** for faster commands:
   ```powershell
   # Add to your PowerShell profile
   function dcdev { docker-compose -f docker-compose.dev.yml $args }
   function dcprod { docker-compose $args }
   
   # Then use:
   dcdev up
   dcprod up
   ```

2. **Watch logs in real-time:**
   ```powershell
   docker-compose -f docker-compose.dev.yml logs -f frontend
   ```

3. **Restart just frontend:**
   ```powershell
   docker-compose -f docker-compose.dev.yml restart frontend
   ```

4. **Keep database running, restart only frontend:**
   ```powershell
   docker-compose -f docker-compose.dev.yml up -d postgres backend
   docker-compose -f docker-compose.dev.yml up frontend
   ```

---

**Your hot reload setup is complete and ready to use!** 🎉
