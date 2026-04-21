# Business Unit Fix - Verification & Testing Guide

## ✅ Changes Applied (April 16, 2026)

### 1. **Backend** (Already Correct ✅)
- ✅ `create-rrf.dto.ts` - Has `businessUnit?: string`
- ✅ `update-rrf.dto.ts` - Has `businessUnit?: string`
- ✅ `rrf.entity.ts` - Maps to DB column `business_unit`
- ✅ `rrf.service.ts` - Saves via spread operator

### 2. **Frontend API Layer** (FIXED ✅)
**File:** `lib/api/rrfApi.js`
- ✅ Added `businessUnit: rrf.businessUnit` to `formatRrfForDisplay()`

### 3. **Shared Component** (FIXED ✅)
**File:** `components/RRFContentSections.jsx`
- ✅ Added `<InfoField label="Business Unit" value={rrfData.businessUnit} />` in Requisition Information section
- ✅ Updated JSDoc to include `businessUnit` in expected fields

### 4. **View Pages** (FIXED ✅)
**All 4 role-based view pages now map businessUnit:**
- ✅ `app/hiring-manager/view-rrf/[id]/page.jsx`
- ✅ `app/hr/view-rrf/[id]/page.jsx`
- ✅ `app/approver/view-rrf/[id]/page.jsx`
- ✅ `app/pmo/view-rrf/[id]/page.jsx`

---

## 🔍 Verification Steps

### **Step 1: Rebuild Docker Containers**

```powershell
cd "c:\Users\SohamKhule\Downloads\RRF_2"

# Rebuild frontend with new code
docker-compose stop frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

# Watch logs for successful build
docker logs rrf-frontend --follow
```

**Expected Output:**
```
✓ Ready in 2.5s
✓ Compiled successfully
```

---

### **Step 2: Verify Database Column**

```powershell
# Connect to PostgreSQL container
docker exec -it rrf-postgres psql -U postgres -d rrf_portal

# Check column exists
\d rrfs;

# Check existing data
SELECT id, position_title, business_unit FROM rrfs LIMIT 5;

# Exit
\q
```

**Expected:** `business_unit` column with type `VARCHAR(50)`

---

### **Step 3: Test Create RRF Flow**

1. **Open Create RRF form:**
   - Navigate to: `http://localhost:3000/hiring-manager/create-rrf`

2. **Select Business Unit:**
   - Fill required fields
   - **Select a Business Unit from dropdown**

3. **Open Browser Console (F12):**
   - Check for debug logs:
   ```
   SUBMIT DATA: { ..., businessUnit: "IT Services", ... }
   ```

4. **Submit the form**

5. **Verify in Database:**
   ```powershell
   docker exec -it rrf-postgres psql -U postgres -d rrf_portal -c "SELECT id, position_title, business_unit FROM rrfs ORDER BY id DESC LIMIT 1;"
   ```

   **Expected Output:**
   ```
   id | position_title      | business_unit
   ---+---------------------+--------------
   42 | Senior React Dev    | IT Services
   ```

---

### **Step 4: Test RRF Detail Views**

1. **Navigate to a view page:**
   - PMO: `http://localhost:3000/pmo/view-rrf/[id]`
   - HM: `http://localhost:3000/hiring-manager/view-rrf/[id]`
   - HR: `http://localhost:3000/hr/view-rrf/[id]`
   - Approver: `http://localhost:3000/approver/view-rrf/[id]`

2. **Check Requisition Information section:**
   - Should display **Business Unit** field
   - Value should match what was selected during creation

3. **Open Browser Console:**
   - Check for API response log:
   ```javascript
   RRF DATA: { ..., businessUnit: "IT Services", ... }
   ```

---

### **Step 5: Verify API Response**

```powershell
# Test API endpoint directly
curl http://localhost:4000/rrf/1 | ConvertFrom-Json | Select-Object id, positionTitle, businessUnit
```

**Expected Output:**
```json
{
  "id": 1,
  "positionTitle": "Senior React Developer",
  "businessUnit": "IT Services"
}
```

---

## 🧪 End-to-End Test Checklist

- [ ] Database column `business_unit` exists and is nullable
- [ ] Business Unit dropdown appears in Create RRF form (Step 1)
- [ ] Business Unit value is included in form submission payload
- [ ] Backend saves businessUnit to database
- [ ] API response includes businessUnit field
- [ ] All 4 view pages display Business Unit in Requisition Information
- [ ] Business Unit updates correctly when editing an RRF

---

## 🐛 Troubleshooting

### **Issue: Business Unit not saving**

**Check:**
```powershell
# Backend logs
docker logs rrf-backend --tail 50

# Look for: "[DEBUG RRF Service] Incoming payload:"
# Verify businessUnit is present
```

**Fix:**
- Ensure form field name is exactly `businessUnit` (camelCase)
- Check browser Network tab → Request Payload

---

### **Issue: Business Unit not displaying**

**Check:**
```powershell
# API response
curl http://localhost:4000/rrf/1 | ConvertFrom-Json | Format-List
```

**Fix:**
- If API returns `businessUnit: null` → Data wasn't saved (check backend)
- If API returns `businessUnit: "IT Services"` but UI shows nothing → Clear browser cache and rebuild frontend

---

### **Issue: Field shows as "N/A"**

**Cause:** InfoField component treats `null`, `undefined`, `""`, and `"N/A"` as empty

**Fix:**
- Verify database has actual value (not NULL)
- Check network tab → Response Data → `businessUnit` should have value

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREATE RRF FORM                                          │
│    ModernRRFForm.jsx                                        │
│    • User selects Business Unit from dropdown               │
│    • Form submits: { ..., businessUnit: "IT Services" }     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. FRONTEND API CALL                                        │
│    rrfApi.create(payload)                                   │
│    POST /rrf → { businessUnit: "IT Services", ... }         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. BACKEND DTO VALIDATION                                   │
│    create-rrf.dto.ts                                        │
│    ✅ businessUnit?: string                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. BACKEND SERVICE                                          │
│    rrf.service.ts - create()                                │
│    const rrf = { ...createRrfDto }  ← businessUnit included │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. DATABASE SAVE                                            │
│    rrf.entity.ts                                            │
│    @Column({ name: 'business_unit' })                       │
│    businessUnit: string  → saves to DB                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. VIEW RRF PAGE                                            │
│    GET /rrf/:id → returns { businessUnit: "IT Services" }   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. FORMAT FOR DISPLAY                                       │
│    formatRrfForDisplay()                                    │
│    ✅ businessUnit: rrf.businessUnit                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. VIEW PAGE DATA MAPPING                                   │
│    All 4 view pages:                                        │
│    ✅ businessUnit: rrf.businessUnit                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. RENDER IN UI                                             │
│    RRFContentSections.jsx                                   │
│    ✅ <InfoField label="Business Unit"                      │
│                 value={rrfData.businessUnit} />             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Success Criteria

**Business Unit should now:**
- ✅ Be selectable in Create RRF form
- ✅ Be saved to database (`business_unit` column)
- ✅ Be returned in API responses
- ✅ Be displayed in all 4 RRF detail views:
  - PMO view
  - Hiring Manager view
  - HR view
  - Approver view

---

## 🚀 Next Steps

1. Run the rebuild commands above
2. Test creating a new RRF with Business Unit
3. Verify it displays in all view pages
4. Check browser console for any errors
5. Report any issues with screenshots

---

**Last Updated:** April 16, 2026  
**Status:** ✅ All fixes applied - Ready for testing
