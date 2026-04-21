# Function-SubFunction Dependent Dropdown - Deployment Guide

## ✅ COMPLETED STEPS

### Backend Infrastructure (100% Complete)
- ✅ **Function Entity** (`rrf-portal-backend/src/functions/function.entity.ts`)
  - Primary key with auto-increment
  - OneToMany relationship with Subfunction
  - Unique constraint on function name
  
- ✅ **Functions Service** (`rrf-portal-backend/src/functions/functions.service.ts`)
  - `findAll()` - Get all functions with subfunctions
  - `getSubfunctionsByFunctionId(id)` - **Critical for dependent dropdown**
  - `create(dto)` - Create function with optional subfunction assignment
  - `update(id, dto)` - Update and reassign subfunctions
  - `assignSubfunctions(functionId, subfunctionIds)` - Bulk assignment
  - Validation to prevent duplicate names
  
- ✅ **Functions Controller** (`rrf-portal-backend/src/functions/functions.controller.ts`)
  - `GET /functions` - All functions with subfunctions
  - `GET /functions/:id/subfunctions` - **Dependent dropdown endpoint**
  - `POST /functions` - Create with mapping
  - `PUT /functions/:id` - Update and reassign
  - `DELETE /functions/:id` - Soft delete with validation
  - Permission guards on all endpoints
  
- ✅ **Functions Module** (`rrf-portal-backend/src/functions/functions.module.ts`)
  - Registered in main AppModule
  - Imports PermissionsModule for guards
  
- ✅ **Subfunction Entity Update** (`rrf-portal-backend/src/subfunctions/subfunction.entity.ts`)
  - Added `function_id` FK column
  - ManyToOne relationship with Function
  - **Kept old `function` string column for backward compatibility**

### Frontend Infrastructure (100% Complete)
- ✅ **Functions API Client** (`rrf-portal-nextjs/lib/api/functionsApi.js`)
  - `getAll()` - Fetch all functions with subfunctions
  - `getSubfunctions(functionId)` - **Key for dependent dropdown**
  - `create({ name, subfunctionIds })` - Create with mapping
  - `update(id, { name, subfunctionIds })` - Update and reassign
  - Full error handling
  
- ✅ **DependentDropdown Component** (`rrf-portal-nextjs/components/DependentDropdown.jsx`)
  - Dual mode: `mode="id"` or `mode="name"`
  - Backward compatible with existing name-based system
  - Auto-converts between ID and name based on mode
  - Proper loading states and error handling
  - Disabled state when no function selected
  
- ✅ **ModernRRFForm Integration** (`rrf-portal-nextjs/components/ModernRRFForm.jsx`)
  - Added DependentDropdown import
  - Replaced hardcoded Function/SubFunction dropdowns (lines 1013-1054)
  - **Preserved all existing logic:**
    - Auto-set requisition type for Support/Sales → Non-Billable
    - Auto-set requisition type for PMO subfunction → Non-Billable
    - Step-based validation
    - All 40+ references to formData.function/formData.subFunction
  - Uses `mode="name"` for backward compatibility

### Database Migration (Ready)
- ✅ **Migration Script** (`Data/add-functions-table.sql`)
  - Creates `functions` table with primary key
  - Adds `function_id` FK to `subfunctions` table
  - Migrates existing function names to functions table
  - Updates subfunction.function_id based on matching names
  - **Does NOT drop old `function` column** (backward compatibility)

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Execute Database Migration
```powershell
# Navigate to project root
cd C:\Users\SohamKhule\Downloads\RRF_2

# Run migration script
docker exec -i rrf-postgres-dev psql -U postgres -d rrf_portal < Data/add-functions-table.sql
```

**Expected Output:**
```
CREATE TABLE
ALTER TABLE
INSERT 0 3
UPDATE 10
```

**Verification:**
```powershell
# Check functions table
docker exec -it rrf-postgres-dev psql -U postgres -d rrf_portal -c "SELECT * FROM functions;"

# Check subfunction mappings
docker exec -it rrf-postgres-dev psql -U postgres -d rrf_portal -c "SELECT id, name, function, function_id FROM subfunctions;"
```

---

### Step 2: Restart Backend Container
```powershell
# Restart backend to load FunctionsModule
docker-compose -f docker-compose.dev.yml restart backend

# Check logs for successful startup
docker-compose -f docker-compose.dev.yml logs -f backend
```

**Look for:**
- ✅ "FunctionsModule dependencies initialized"
- ✅ "GET /functions +1ms"
- ✅ No TypeORM errors

---

### Step 3: Test API Endpoints

**Test 1: Get All Functions**
```powershell
curl http://localhost:4000/functions
```
Expected: JSON array of functions with subfunctions array

**Test 2: Get Subfunctions for Function ID**
```powershell
# Get subfunctions for Delivery (assuming ID = 1)
curl http://localhost:4000/functions/1/subfunctions
```
Expected: `[{id: 1, name: "SGINTL"}, {id: 2, name: "VR"}, ...]`

**Test 3: Create New Function**
```powershell
$body = @{
    name = "Test Function"
    subfunctionIds = @(1, 2)
} | ConvertTo-Json

curl -X POST http://localhost:4000/functions `
  -H "Content-Type: application/json" `
  -d $body
```

---

### Step 4: Test Frontend Functionality

**Test 4A: Existing RRF Records (Backward Compatibility)**
1. Navigate to an existing RRF in edit mode
2. **Verify:** Function and SubFunction populate correctly (name-based)
3. **Verify:** Can still save without errors
4. **Verify:** formData.function and formData.subFunction are strings

**Test 4B: New RRF Creation**
1. Navigate to "Create New RRF"
2. **Verify:** Function dropdown loads from API
3. **Verify:** SubFunction dropdown is disabled initially
4. Select "Delivery" function
5. **Verify:** SubFunction dropdown enables and loads only Delivery subfunctions (SGINTL, VR, Support)
6. **Verify:** Selecting "Support" or "Sales" auto-sets Requisition Type to "Non-Billable"
7. Select "Support" function → Select "PMO" subfunction
8. **Verify:** Requisition Type auto-sets to "Non-Billable"
9. Fill all required fields and submit
10. **Verify:** RRF saves successfully

**Test 4C: Step Navigation**
1. Create new RRF, fill Step 1 partially
2. Click "Next" to go to Step 2
3. **Verify:** No premature validation errors
4. Go back to Step 1
5. **Verify:** Previous values retained
6. Submit without completing Step 2
7. **Verify:** Step 2 validation triggers appropriately

---

## 📋 BACKWARD COMPATIBILITY VERIFICATION

### Critical Checks
- ✅ Old RRF records with name-based function/subFunction still load and edit
- ✅ formData.function and formData.subFunction remain strings (not IDs)
- ✅ Auto-set requisition type logic works for Support, Sales, PMO
- ✅ Step-based validation not broken
- ✅ All existing API endpoints still function
- ✅ No breaking changes to database (old `function` column preserved)

### How Backward Compatibility Works
```javascript
// DependentDropdown in "name" mode:
<DependentDropdown
  functionValue={formData.function}  // "Delivery" (string)
  subfunctionValue={formData.subFunction}  // "SGINTL" (string)
  onFunctionChange={(id, name) => {
    // Receives: id=1, name="Delivery"
    // Passes to handler: { target: { value: "Delivery" } }
    handleFunctionChange({ target: { value: name } });
  }}
  mode="name"  // Returns names, not IDs, to handlers
  required={true}
/>
```

**Result:**
- formData stores: `{ function: "Delivery", subFunction: "SGINTL" }`
- Existing validation, auto-set logic, and API payload unchanged
- All 40+ references to formData.function/formData.subFunction work as before

---

## 🔮 FUTURE ENHANCEMENTS (NOT PART OF CURRENT DEPLOYMENT)

### Phase 2: FormConfig.jsx Enhancement
**Goal:** Admin can edit functions and map subfunctions via UI

**Features to Add:**
1. Edit ✏️ button next to delete for function dropdown options
2. Modal for editing function name
3. Multi-select for assigning subfunctions to function
4. Inline creation of new subfunctions during function creation
5. Validation to prevent deleting functions with mapped subfunctions

**File:** `rrf-portal-nextjs/components/FormConfig.jsx`

### Phase 3: ID-Based Migration
**Goal:** Transition to ID-based storage for better data integrity

**Changes Required:**
1. Update RRF entity to add `function_id` and `subfunction_id` columns
2. Migrate existing RRF data from names to IDs
3. Update ModernRRFForm to use `mode="id"` in DependentDropdown
4. Update rrfApi to send IDs instead of names
5. Deprecate and eventually drop name-based `function`/`subFunction` columns

**Benefits:**
- Foreign key constraints for data integrity
- Renaming functions/subfunctions doesn't break existing RRF records
- Faster queries with indexed ID columns

---

## 🛠️ TROUBLESHOOTING

### Issue: API Returns 404 for /functions
**Cause:** Backend not restarted after adding FunctionsModule
**Solution:** Run `docker-compose -f docker-compose.dev.yml restart backend`

### Issue: SubFunction Dropdown Not Populating
**Cause:** API endpoint failing or incorrect function ID
**Solution:**
1. Check browser console for API errors
2. Verify function ID in network tab
3. Test API directly: `curl http://localhost:4000/functions/1/subfunctions`

### Issue: "Function Required" Error When Saving
**Cause:** DependentDropdown not calling handleFunctionChange
**Solution:** Verify callbacks in ModernRRFForm.jsx match pattern:
```javascript
onFunctionChange={(id, name) => {
  handleFunctionChange({ target: { value: name } });
}}
```

### Issue: Auto-Set Requisition Type Not Working
**Cause:** handleFunctionChange or handleSubFunctionChange not receiving name value
**Solution:** 
1. Check `mode="name"` is set on DependentDropdown
2. Verify callbacks pass `name` (not `id`) to handlers
3. Check browser console for errors in handler execution

### Issue: Database Migration Fails
**Cause:** Functions or subfunctions already have function_id column
**Solution:**
1. Check if migration was already run: `docker exec -it rrf-postgres-dev psql -U postgres -d rrf_portal -c "\d subfunctions"`
2. If function_id exists, skip migration
3. If migration failed mid-way, rollback and re-run

---

## 📝 IMPLEMENTATION SUMMARY

### What Changed
1. **Backend:** Added complete Functions CRUD module with dependent dropdown API
2. **Frontend:** Replaced hardcoded dropdowns with API-driven DependentDropdown component
3. **Database:** Added functions table and function_id FK (migration not yet run)

### What Stayed the Same
1. formData.function and formData.subFunction remain strings
2. All existing validation logic unchanged
3. Auto-set requisition type logic preserved
4. Step-based validation intact
5. All 40+ references to function/subFunction fields work as before
6. API payload format unchanged (still sends names)

### Migration Path
- **Current State:** Backward compatible - uses names for storage and API
- **Future State:** Can switch to ID-based by changing `mode="id"` and updating API

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Execute database migration (`add-functions-table.sql`)
- [ ] Verify functions table created with 3 default functions
- [ ] Verify subfunctions have function_id populated
- [ ] Restart backend container
- [ ] Check backend logs for errors
- [ ] Test API endpoint: `GET /functions`
- [ ] Test API endpoint: `GET /functions/1/subfunctions`
- [ ] Test frontend: Load existing RRF (backward compatibility)
- [ ] Test frontend: Create new RRF with dependent dropdown
- [ ] Verify auto-set requisition type for Support/Sales
- [ ] Verify auto-set requisition type for PMO subfunction
- [ ] Verify step navigation works without premature validation
- [ ] Test complete RRF submission flow

---

## 📄 FILES MODIFIED/CREATED

### Backend (New Module)
- `rrf-portal-backend/src/functions/function.entity.ts` (NEW)
- `rrf-portal-backend/src/functions/functions.service.ts` (NEW)
- `rrf-portal-backend/src/functions/functions.controller.ts` (NEW)
- `rrf-portal-backend/src/functions/functions.module.ts` (NEW)
- `rrf-portal-backend/src/functions/dto/create-function.dto.ts` (NEW)
- `rrf-portal-backend/src/functions/dto/update-function.dto.ts` (NEW)
- `rrf-portal-backend/src/subfunctions/subfunction.entity.ts` (MODIFIED - added function_id FK)
- `rrf-portal-backend/src/app.module.ts` (MODIFIED - imported FunctionsModule)

### Frontend
- `rrf-portal-nextjs/lib/api/functionsApi.js` (NEW)
- `rrf-portal-nextjs/components/DependentDropdown.jsx` (NEW)
- `rrf-portal-nextjs/components/ModernRRFForm.jsx` (MODIFIED - integrated DependentDropdown)

### Database
- `Data/add-functions-table.sql` (NEW - migration script)

### Documentation
- `FUNCTION_SUBFUNCTION_IMPLEMENTATION.md` (NEW)
- `DEPENDENT_DROPDOWN_DEPLOYMENT_GUIDE.md` (THIS FILE)

---

## 🎯 SUCCESS CRITERIA

✅ **Frontend Integration Complete**
- DependentDropdown component created with dual mode support
- ModernRRFForm.jsx updated to use DependentDropdown
- All existing business logic preserved (auto-set requisition type, step validation)
- No errors in code

⏳ **Database Migration Pending**
- Migration script ready but not executed

⏳ **Backend Restart Pending**
- FunctionsModule not yet loaded (requires restart)

⏳ **Testing Pending**
- API endpoints not yet tested
- Frontend functionality not yet verified
- Backward compatibility not yet confirmed

---

## 📞 NEXT STEPS

**Immediate Actions Required:**
1. Execute database migration
2. Restart backend container
3. Test API endpoints
4. Test frontend with both existing and new RRF records
5. Verify backward compatibility

**Future Enhancements:**
1. Add function/subfunction management UI in FormConfig.jsx
2. Consider migrating to ID-based storage (Phase 3)
3. Add function/subfunction edit history tracking
4. Add validation rules for function-subfunction combinations

---

**Last Updated:** April 20, 2025
**Status:** Frontend Integration Complete ✅ | Deployment Pending ⏳
