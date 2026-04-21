# Docker Fix Instructions for Business Unit and RRF Details

## Issues Fixed:

1. ✅ Added `businessUnit` field to backend DTO (CreateRrfDto, UpdateRrfDto)
2. ✅ Added `business_unit` column to RRF entity
3. ✅ Added `business_unit` column to database table
4. ✅ Form config already exists in database

## Steps to Apply Fixes:

### 1. Database Migration (Already Applied)
```bash
# Already executed - verify with:
docker exec rrf-postgres psql -U postgres -d rrf_portal \
  -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'rrfs' AND column_name = 'business_unit';"
```

### 2. Rebuild Backend Docker Container

```powershell
# Stop and remove backend container
docker stop rrf-backend
docker rm rrf-backend

# Rebuild backend image with latest code changes
docker-compose build backend

# Start backend container
docker-compose up -d backend

# Check backend logs
docker logs rrf-backend -f
```

### 3. Rebuild Frontend Docker Container (Clear Next.js cache)

```powershell
# Stop and remove frontend container
docker stop rrf-frontend
docker rm rrf-frontend

# Remove Next.js build cache
docker exec rrf-frontend rm -rf .next 2>$null

# Rebuild frontend image
docker-compose build frontend

# Start frontend container
docker-compose up -d frontend

# Check frontend logs
docker logs rrf-frontend -f
```

### 4. Complete Rebuild (If Above Doesn't Work)

```powershell
# Stop all containers
docker-compose down

# Remove old images (force fresh build)
docker rmi rrf_2-backend rrf_2-frontend

# Rebuild and start everything
docker-compose build --no-cache
docker-compose up -d

# Watch logs
docker-compose logs -f
```

## Verification Steps:

### 1. Test Form Config API
```powershell
# Should see businessUnit in response
curl http://localhost:4000/rrf/form-config `
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test Create RRF Form
- Navigate to: http://localhost:3000/pmo/create-rrf
- Open browser console (F12)
- Look for businessUnit in configs debug logs
- Check Step 1 form - should see "Business Unit" dropdown

### 3. Test RRF Details View
- Navigate to: http://localhost:3000/pmo/view-rrf/{id}
- Open browser console
- Verify "RRF API Response" shows all fields:
  - `createdBy.fullName` (Manager Name)
  - `requiredSkills` (Technical Requirements)
  - `preferredSkills` (Nice to Have)
  - `jobDescription` (Job Description)

## Quick Rebuild Command:

```powershell
# One command to rebuild everything
cd c:\Users\SohamKhule\Downloads\RRF_2
docker-compose down
docker-compose build
docker-compose up -d
docker-compose logs -f backend frontend
```

## If Issues Persist:

### Clear Docker Volumes (Nuclear Option - Loses DB data)
```powershell
docker-compose down -v
docker volume ls | Select-String "rrf" | ForEach-Object { docker volume rm $_.ToString().Split()[1] }
docker-compose up -d
```

### Check Container Status
```powershell
docker ps -a
docker-compose ps
```

### Access Backend Container Shell
```powershell
docker exec -it rrf-backend sh
ls -la
cat package.json
```

### Access Frontend Container Shell
```powershell
docker exec -it rrf-frontend sh
ls -la .next
```

## Expected Result After Rebuild:

✅ Business Unit dropdown appears in Create RRF form (Step 1)
✅ RRF Details show Manager Name correctly
✅ RRF Details show Technical Requirements
✅ RRF Details show Job Description
✅ All roles see same complete data (no role-based filtering)

## Troubleshooting:

### Business Unit Still Not Showing:
1. Check backend logs: `docker logs rrf-backend`
2. Verify DTO has businessUnit field
3. Verify entity has @Column decorator
4. Rebuild backend with `--no-cache`

### RRF Details Still Missing Data:
1. Check API response in browser console
2. Verify backend returns full object (not filtered by role)
3. Check frontend mapping in view-rrf page
4. Rebuild frontend with cleared cache

### Docker Container Won't Start:
1. Check logs: `docker-compose logs backend frontend`
2. Verify port 3000 and 4000 aren't in use
3. Check database connection
4. Restart Docker Desktop
