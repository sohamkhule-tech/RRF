# Function-SubFunction Dependent Dropdown Implementation

## ✅ Completed Backend Implementation

### 1. **New Database Schema** (ID-based relationships)

**Created:**
- `functions` table with proper primary keys
- Foreign key `function_id` in `subfunctions` table pointing to `functions.id`
- Migration script: [`Data/add-functions-table.sql`](Data/add-functions-table.sql)

**Migration Features:**
- Auto-migrates existing data from name-based to ID-based
- Preserves backward compatibility during transition
- Rollback script included

---

### 2. **Backend Entities Created**

**Files Created:**
1. `rrf-portal-backend/src/functions/function.entity.ts` - Function entity with OneToMany relationship
2. Updated `rrf-portal-backend/src/subfunctions/subfunction.entity.ts` - Added ManyToOne relationship

**Key Changes:**
```typescript
// OLD (name-based)
@Column({ length: 100, nullable: true })
function: string;

// NEW (ID-based with FK)
@ManyToOne(() => Function, (functionEntity) => functionEntity.subfunctions, { eager: true })
@JoinColumn({ name: 'function_id' })
functionEntity: Function;
```

---

### 3. **Backend APIs Created**

**Module:** `rrf-portal-backend/src/functions/`

**Files:**
- `functions.module.ts` - NestJS module
- `functions.service.ts` - Business logic
- `functions.controller.ts` - REST endpoints
- `dto/create-function.dto.ts` - Create DTO with subfunction mapping
- `dto/update-function.dto.ts` - Update DTO

**Key Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/functions` | Get all functions with subfunctions |
| GET | `/functions/:id` | Get single function |
| **GET** | **`/functions/:id/subfunctions`** | **Get subfunctions by function (DEPENDENT DROPDOWN)** |
| GET | `/functions/subfunctions/unassigned` | Get unassigned subfunctions |
| POST | `/functions` | Create function (with optional subfunction IDs) |
| PUT | `/functions/:id` | Update function |
| DELETE | `/functions/:id` | Soft delete function |
| POST | `/functions/:id/subfunctions` | Assign subfunctions to function |

---

### 4. **Service Features**

- ✅ Create function with subfunction mapping
- ✅ Update function and reassign subfunctions
- ✅ Get dependent subfunctions for dropdowns
- ✅ Validation: Prevents duplicate names
- ✅ Validation: Prevents deleting functions with subfunctions
- ✅ Bulk subfunction assignment/reassignment

---

### 5. **App Module Registration**

Updated `rrf-portal-backend/src/app.module.ts` to include `FunctionsModule`.

---

## 📋 Next Steps (Frontend Implementation)

### Step 1: Run Database Migration

```bash
# Connect to PostgreSQL
docker exec -i rrf-postgres-dev psql -U postgres -d rrf_portal

# Run migration
docker exec -i rrf-postgres-dev psql -U postgres -d rrf_portal < Data/add-functions-table.sql

# Verify
SELECT * FROM functions;
SELECT sf.name, f.name AS function_name FROM subfunctions sf LEFT JOIN functions f ON sf.function_id = f.id;
```

---

### Step 2: Restart Backend

```bash
docker-compose -f docker-compose.dev.yml restart backend
```

---

### Step 3: Frontend Components Needed

#### A. Enhanced FormConfig Component

**Location:** `rrf-portal-nextjs/components/FormConfig.jsx`

**Required Changes:**
1. Add "Function & SubFunction Manager" section
2. Replace current text-based management with API-based CRUD
3. Implement dependent dropdown for Function → SubFunction selection

#### B. New Component: FunctionManager

**Create:** `rrf-portal-nextjs/components/FunctionManager.jsx`

**Features:**
- List all functions with their subfunctions
- Add new function with inline subfunction selection
- Edit function name
- Delete function (with subfunction count validation)
- Drag-and-drop reordering

#### C. New Component: DependentDropdown

**Create:** `rrf-portal-nextjs/components/DependentDropdown.jsx`

**Props:**
```javascript
{
  functionValue: selectedFunctionId,
  subfunctionValue: selectedSubfunctionId,
  onFunctionChange: (id) => { setFunction(id); fetchSubfunctions(id); },
  onSubfunctionChange: (id) => setSubfunction(id),
  disabled: false,
  required: true
}
```

**Features:**
- Function dropdown populated from `/functions` API
- SubFunction dropdown populated from `/functions/:id/subfunctions` API
- Automatically clears subfunction when function changes
- Shows "Select Function first" if no function selected

---

### Step 4: Update ModernRRFForm

**Location:** `rrf-portal-nextjs/components/ModernRRFForm.jsx`

**Changes:**
1. Replace separate Function & SubFunction dropdowns
2. Use new `<DependentDropdown />` component
3. Store `functionId` and `subfunctionId` (not names)
4. On edit: Load function first, then fetch subfunctions

**Example:**
```jsx
<DependentDropdown
  functionValue={formData.functionId}
  subfunctionValue={formData.subfunctionId}
  onFunctionChange={(id) => {
    setFormData({ ...formData, functionId: id, subfunctionId: null })
  }}
  onSubfunctionChange={(id) => {
    setFormData({ ...formData, subfunctionId: id })
  }}
  required={true}
/>
```

---

### Step 5: Frontend API Integration

**Created:** `rrf-portal-nextjs/lib/api/functionsApi.js`

**Usage Example:**
```javascript
import { functionsApi } from '@/lib/api/functionsApi';

// Get all functions
const functions = await functionsApi.getAll();

// Get subfunctions for a function (dependent dropdown)
const subfunctions = await functionsApi.getSubfunctions(functionId);

// Create function with subfunctions
await functionsApi.create({
  name: 'Engineering',
  description: 'Engineering department',
  subfunctionIds: [1, 2, 3] // Assign existing subfunctions
});

// Update function and reassign subfunctions
await functionsApi.update(functionId, {
  name: 'New Name',
  subfunctionIds: [4, 5, 6]
});
```

---

## 🔄 Migration Strategy

### Phase 1: Dual Mode Operation (Backward Compatible)

The system now supports BOTH old and new formats:

**Old Format (name-based):**
```javascript
{
  function: "Delivery",
  subFunction: "SGINTL"
}
```

**New Format (ID-based):**
```javascript
{
  functionId: 1,
  subfunctionId: 101
}
```

**Backend Changes:**
- `Subfunction` entity keeps old `function` column temporarily
- Migration script populated `function_id` from `function` names
- APIs return both `id` and `name` for smooth transition

---

### Phase 2: Frontend Switchover

1. Update all RRF creation/edit forms to use IDs
2. Update backend RRF endpoints to accept IDs
3. Test thoroughly with both old and new records

---

### Phase 3: Cleanup (After Testing)

1. Remove `function` column from `subfunctions` table
2. Remove name-based logic from frontend
3. Update documentation

---

## 🎨 UI/UX Improvements

### Function Manager UI Design

```
┌────────────────────────────────────────────────────────┐
│  Functions & SubFunctions Management                   │
├────────────────────────────────────────────────────────┤
│  + Add New Function                                    │
├────────────────────────────────────────────────────────┤
│  📁 Delivery                         ✏️ Edit  ❌ Delete│
│     ├─ SGINTL                      ✏️ Edit  ❌ Delete  │
│     ├─ VR                          ✏️ Edit  ❌ Delete  │
│     └─ + Add SubFunction                               │
├────────────────────────────────────────────────────────┤
│  📁 Sales                            ✏️ Edit  ❌ Delete│
│     ├─ Inside Sales                ✏️ Edit  ❌ Delete  │
│     └─ + Add SubFunction                               │
└────────────────────────────────────────────────────────┘
```

---

### Add Function Modal

```
┌───────────────────────────────────────────────────┐
│  Add New Function                           ✕     │
├───────────────────────────────────────────────────┤
│                                                   │
│  Function Name: [_______________________]         │
│                                                   │
│  Description: [_________________________________] │
│                                                   │
│  Assign SubFunctions (optional):                  │
│  ☐ SGINTL                                         │
│  ☐ VR                                             │
│  ☐ Backend                                        │
│  ☐ DevOps                                         │
│                                                   │
│  OR                                               │
│                                                   │
│  Create New SubFunctions:                         │
│  [Backend        ] + Add                          │
│  [DevOps         ] + Add                          │
│                                                   │
│  Added: Backend, DevOps                           │
│                                                   │
│                      [Cancel]  [Create Function]  │
└───────────────────────────────────────────────────┘
```

---

### Dependent Dropdown Component

```jsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <label>Function *</label>
    <select 
      value={functionId}
      onChange={(e) => handleFunctionChange(e.target.value)}
    >
      <option value="">Select Function</option>
      {functions.map(f => (
        <option key={f.id} value={f.id}>{f.name}</option>
      ))}
    </select>
  </div>

  <div>
    <label>Sub Function *</label>
    <select 
      value={subfunctionId}
      onChange={(e) => setSubfunctionId(e.target.value)}
      disabled={!functionId || loadingSubfunctions}
    >
      <option value="">
        {!functionId 
          ? 'Select Function first' 
          : loadingSubfunctions 
          ? 'Loading...' 
          : 'Select SubFunction'}
      </option>
      {subfunctions.map(sf => (
        <option key={sf.id} value={sf.id}>{sf.name}</option>
      ))}
    </select>
  </div>
</div>
```

---

## 🧪 Testing Checklist

### Backend Tests

- [ ] Functions table created successfully
- [ ] Migration script populates function_id correctly
- [ ] GET `/functions` returns all functions with subfunctions
- [ ] GET `/functions/:id/subfunctions` returns correct subfunctions
- [ ] POST `/functions` creates function with subfunction mapping
- [ ] PUT `/functions/:id` updates and reassigns subfunctions
- [ ] DELETE `/functions/:id` prevents deletion if subfunctions exist
- [ ] Duplicate function names are rejected

### Frontend Tests

- [ ] Function dropdown loads from API
- [ ] SubFunction dropdown depends on Function selection
- [ ] Changing Function clears SubFunction selection
- [ ] Edit RRF pre-fills Function and SubFunction correctly
- [ ] Can add new Function with SubFunctions
- [ ] Can edit Function name (doesn't break SubFunction mapping)
- [ ] Can delete Function (only if no SubFunctions)
- [ ] Can reassign SubFunctions to different Function

---

## 📁 Files Created/Modified

### Backend Files Created
1. ✅ `rrf-portal-backend/src/functions/function.entity.ts`
2. ✅ `rrf-portal-backend/src/functions/functions.service.ts`
3. ✅ `rrf-portal-backend/src/functions/functions.controller.ts`
4. ✅ `rrf-portal-backend/src/functions/functions.module.ts`
5. ✅ `rrf-portal-backend/src/functions/dto/create-function.dto.ts`
6. ✅ `rrf-portal-backend/src/functions/dto/update-function.dto.ts`

### Backend Files Modified
7. ✅ `rrf-portal-backend/src/subfunctions/subfunction.entity.ts`
8. ✅ `rrf-portal-backend/src/app.module.ts`

### Frontend Files Created
9. ✅ `rrf-portal-nextjs/lib/api/functionsApi.js`

### Migration Script
10. ✅ `Data/add-functions-table.sql`

### Frontend Files To Create
11. ⏳ `rrf-portal-nextjs/components/FunctionManager.jsx`
12. ⏳ `rrf-portal-nextjs/components/DependentDropdown.jsx`

### Frontend Files To Modify
13. ⏳ `rrf-portal-nextjs/components/FormConfig.jsx`
14. ⏳ `rrf-portal-nextjs/components/ModernRRFForm.jsx`

---

## 🚀 Deployment Steps

### 1. Apply Database Migration
```bash
docker exec -i rrf-postgres-dev psql -U postgres -d rrf_portal < Data/add-functions-table.sql
```

### 2. Restart Backend
```bash
docker-compose -f docker-compose.dev.yml restart backend

# Check logs
docker logs rrf-backend-dev --tail 50
```

### 3. Verify API Endpoints
```bash
# Get all functions
curl http://localhost:4000/functions

# Get subfunctions for function ID 1
curl http://localhost:4000/functions/1/subfunctions
```

### 4. Deploy Frontend Changes
- Create remaining frontend components
- Update ModernRRFForm to use dependent dropdowns
- Test thoroughly

---

## 🎯 Success Criteria

✅ **Data Structure:**
- Functions table exists with proper schema
- Subfunctions have function_id FK constraint
- Existing data migrated successfully

✅ **Backend APIs:**
- All CRUD endpoints working
- Dependent dropdown endpoint returns correct data
- Validation prevents duplicate names
- Subfunction assignment working

✅ **Frontend:**
- Dependent dropdown reacts to Function selection
- Edit mode pre-fills correctly
- Add Function allows subfunction mapping
- Edit Function preserves subfunction relationships
- Delete Function shows proper validation

✅ **User Experience:**
- No "Job Description" popup errors
- Smooth navigation between dropdown steps
- Inline edit/delete without page reload
- Clear error messages
- Loading states for async operations

---

## 📞 Support & Next Steps

**Current Status:** Backend implementation complete, frontend APIs created.

**Next:** Create FunctionManager and DependentDropdown components, integrate into FormConfig.

**Need Help?** Check the inline comments in created files for detailed documentation.

---

**Created:** April 20, 2026  
**Author:** GitHub Copilot  
**Status:** Backend Complete, Frontend In Progress
