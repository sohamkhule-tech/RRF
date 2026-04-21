# Fix: Fill From Bench - Missing status_history Column

## Problem
When clicking "Confirm & Close" (Fill from Bench), the API fails with:
```
POST /rrf/:id/fill-by-bench
500 Internal Server Error
"column 'status_history' does not exist"
```

## Root Cause
The backend code tries to use `status_history` column to track status changes, but this column doesn't exist in the database.

## Solution Applied

### 1. ✅ Fixed Entity Definition
**File:** `rrf-portal-backend/src/rrf/entities/rrf.entity.ts`

Added proper column name mapping:
```typescript
@Column({ 
  name: 'status_history',  // ✅ Explicit snake_case mapping
  type: 'jsonb', 
  nullable: true,
  default: () => "'[]'::jsonb"  // Default to empty array
})
statusHistory: any;
```

### 2. ✅ Created Migration Script
**File:** `Data/add-status-history-column.sql`

SQL to add the missing column:
```sql
ALTER TABLE rrfs
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;
```

---

## How to Apply Fix

### Option 1: Run SQL Manually (FASTEST)

1. **Connect to PostgreSQL:**
   ```bash
   # If using Docker:
   docker exec -it rrf-postgres-dev psql -U postgres -d rrf_portal
   
   # OR if using local PostgreSQL:
   psql -U postgres -d rrf_portal
   ```

2. **Run the migration:**
   ```sql
   ALTER TABLE rrfs
   ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;
   ```

3. **Verify column exists:**
   ```sql
   SELECT column_name, data_type, column_default
   FROM information_schema.columns
   WHERE table_name = 'rrfs' AND column_name = 'status_history';
   ```

   Expected output:
   ```
    column_name    | data_type | column_default
   ----------------+-----------+------------------
    status_history | jsonb     | '[]'::jsonb
   ```

4. **Exit PostgreSQL:**
   ```
   \q
   ```

### Option 2: Run SQL File (RECOMMENDED)

```bash
# If using Docker:
docker exec -i rrf-postgres-dev psql -U postgres -d rrf_portal < Data/add-status-history-column.sql

# OR if using local PostgreSQL:
psql -U postgres -d rrf_portal -f Data/add-status-history-column.sql
```

### Option 3: TypeORM Sync (NOT RECOMMENDED for Production)

If you have TypeORM synchronization enabled:

1. Restart backend container:
   ```bash
   docker-compose -f docker-compose.dev.yml restart backend
   ```

2. TypeORM will auto-create the column on startup

**⚠️ Warning:** Auto-sync can be dangerous in production. Use migrations instead.

---

## Restart Backend

After adding the column, restart the backend:

```bash
# If using Docker:
docker-compose -f docker-compose.dev.yml restart backend

# OR if running locally:
cd rrf-portal-backend
npm run start:dev
```

---

## Test the Fix

### 1. Test Fill From Bench
1. Login as **PMO** user
2. Navigate to an **APPROVED** or **IN_PROGRESS** RRF
3. Click **"Fill from Bench"** button
4. Fill in:
   - Candidate Name
   - Date of Joining
5. Click **"Confirm & Close"**
6. ✅ Should succeed without 500 error
7. ✅ RRF status should change to **CLOSED_BY_BENCH**
8. ✅ Internal RRF number should be generated

### 2. Verify in Database
```sql
-- Check if status_history is populated
SELECT id, status, status_history 
FROM rrfs 
WHERE status = 'closed-by-bench'
LIMIT 1;
```

Should show array with status change history:
```json
[
  {
    "status": "closed-by-bench",
    "changedById": 1,
    "changedAt": "2026-04-17T...",
    "reason": "Filled by bench - Internal RRF: RRF-INT-001, Candidate: John Doe"
  }
]
```

---

## Verification Checklist

- [ ] SQL column added successfully
- [ ] Backend restarted
- [ ] Fill from Bench works without errors
- [ ] Status history is being recorded
- [ ] Internal RRF number is generated
- [ ] RRF status changes to CLOSED_BY_BENCH
- [ ] Candidate name and joining date are saved

---

## What Was Fixed

| Issue | Before | After |
|-------|--------|-------|
| **Database** | No status_history column | ✅ JSONB column added |
| **Entity** | No column name mapping | ✅ Explicit name: 'status_history' |
| **Default Value** | NULL | ✅ Empty array '[]'::jsonb |
| **API Error** | 500 "column does not exist" | ✅ Works correctly |
| **Status Tracking** | Not recorded | ✅ Full history tracked |

---

## Additional Info

### What is status_history?

`status_history` tracks every status change of an RRF:

```json
[
  {
    "status": "draft",
    "changedById": 5,
    "changedAt": "2026-04-15T10:00:00Z"
  },
  {
    "status": "pending",
    "changedById": 5,
    "changedAt": "2026-04-15T10:30:00Z"
  },
  {
    "status": "approved",
    "changedById": 2,
    "changedAt": "2026-04-16T09:00:00Z",
    "reason": "Approved by manager"
  },
  {
    "status": "closed-by-bench",
    "changedById": 3,
    "changedAt": "2026-04-17T14:00:00Z",
    "reason": "Filled by bench - Internal RRF: RRF-INT-001"
  }
]
```

This provides a complete audit trail of all workflow changes.

---

## Rollback (if needed)

If you need to remove the column:

```sql
ALTER TABLE rrfs DROP COLUMN IF EXISTS status_history;
```

Then restart backend.

---

## Summary

✅ **Entity fixed** - Added explicit column name mapping
✅ **Migration created** - SQL script to add column
✅ **Default value set** - New rows get empty array
✅ **Safe to run multiple times** - Uses IF NOT EXISTS
✅ **Ready to test** - Apply SQL and restart backend

The "Fill from Bench" feature should now work without errors!
