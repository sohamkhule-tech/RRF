# DYNAMIC FORM CONFIG SYSTEM - TESTING & VERIFICATION GUIDE

## Overview
This guide helps you verify the refactored Dynamic Form Config system is working correctly.

---

## PART 1: Add Business Unit Field

### Option A: Via SQL (Fastest)

1. **Run SQL Script:**
   ```powershell
   cd c:\Users\SohamKhule\Downloads\RRF_2
   docker exec -i rrf_2-db-1 psql -U postgres -d rrf_portal < Data/add-business-unit-field.sql
   ```

2. **Verify in Database:**
   ```powershell
   docker exec -it rrf_2-db-1 psql -U postgres -d rrf_portal -c "SELECT * FROM form_config WHERE fieldName = 'businessUnit';"
   ```

### Option B: Via Admin UI (Recommended for Testing)

1. **Navigate to:** http://localhost:3000/pmo/form-config
2. **Click:** "Add New Field to Step 1"
3. **Fill in:**
   - Field Label: `Business Unit`
   - Field Type: `Dropdown`
   - Options: Click "Add" for each:
     - SG
     - VR
     - PMO
     - Internal
   - Check: ✓ Make this field mandatory
   - Section: `Organization`
4. **Click:** "Create Field"
5. **Verify:** Business Unit appears in Step 1 field grid

---

## PART 2: Verify UX Improvements

### ✅ Check 1: No Technical Field Names in UI

**Expected:**
- Admin UI should NOT show "Field Name (Programmatic)" input
- Only "Field Label" input should be visible in Add Field modal

**Test:**
1. Open: http://localhost:3000/pmo/form-config
2. Click: "Add New Field to Step 1"
3. Verify: Modal only asks for "Field Label", not "Field Name"

---

### ✅ Check 2: Auto-Generated fieldName

**Expected:**
- When you enter "Business Unit" as label, system auto-generates `businessUnit` internally

**Test:**
1. Create field with label: "Cost Center Name"
2. Open browser console
3. Look at console log: Should show `fieldName: "costCenterName"`

---

### ✅ Check 3: Dynamic Option Builder (No Textarea)

**Expected:**
- Should see input field + "Add" button
- Options appear as individual cards with [x] delete button
- Can press Enter to add option

**Test:**
1. Add New Field modal
2. Set Field Type: Dropdown
3. Type "Option 1" and press Enter
4. Verify: Option appears as a card with [x] button
5. Verify: NO textarea visible

---

### ✅ Check 4: Technical Fields Hidden

**Expected:**
- System fields (entity, function, subFunction, etc.) should NOT appear in Form Config UI

**Test:**
1. Open: http://localhost:3000/pmo/form-config
2. Scroll through Step 1 and Step 2
3. Verify: You should ONLY see user-created fields (like Business Unit)
4. Verify: You should NOT see: entity, organisation, function, subFunction, requisitionType, etc.

---

### ✅ Check 5: Mandatory Toggle Working

**Expected:**
- Each field card should have "Mandatory Field" checkbox
- Checked fields show asterisk (*) in RRF form

**Test:**
1. Open Form Config
2. Find Business Unit field
3. Toggle checkbox: "Mandatory Field (required in RRF form)"
4. Click Save
5. Open: http://localhost:3000/hiring-manager/create
6. Verify: Business Unit label shows red asterisk (*)

---

## PART 3: Verify Dynamic Rendering in RRF Form

### ✅ Check 6: Business Unit Appears in Create Form

**Test:**
1. Navigate to: http://localhost:3000/hiring-manager/create
2. Step 1 - Requisition Details
3. Look for: Business Unit dropdown
4. Verify: Options are: SG, VR, PMO, Internal
5. Verify: Red asterisk (*) shown if mandatory
6. Verify: Field is between SubFunction and Position Type

---

### ✅ Check 7: Add Custom Field and See It Render

**Test:**
1. Add field via Form Config:
   - Label: "Cost Center"
   - Type: Dropdown
   - Options: CC001, CC002, CC003
   - Step: 1
   - Required: Yes
2. Go to Create RRF form
3. Verify: "Cost Center" dropdown appears in Step 1
4. Verify: Has asterisk (*)
5. Verify: Shows CC001, CC002, CC003 options

---

### ✅ Check 8: Validation Enforces Required Fields

**Test:**
1. Create RRF form
2. Fill all fields EXCEPT Business Unit
3. Click Next → Next → Submit
4. Expected: Toast error: "Please fill in required fields: Business Unit"

---

### ✅ Check 9: Edit Form Pre-fills Dynamic Fields

**Test:**
1. Create and save a draft RRF with Business Unit = "SG"
2. Edit the draft
3. Verify: Business Unit dropdown shows "SG" pre-selected
4. Change to "VR" and save
5. Edit again
6. Verify: Shows "VR"

---

## PART 4: Backend Integration

### ✅ Check 10: Dynamic Fields Sent to Backend

**Test:**
1. Open browser console
2. Create RRF with:
   - Business Unit: SG
   - Cost Center: CC001
3. Before clicking Submit, check console log
4. Look for: `[RRF Submit] Payload to POST /rrf:`
5. Verify JSON includes:
   ```json
   {
     "businessUnit": "SG",
     "costCenter": "CC001",
     ...
   }
   ```

---

## PART 5: Edge Cases

### ✅ Check 11: Empty Dropdown Shows Placeholder

**Test:**
1. Create RRF form
2. Business Unit dropdown (before selecting)
3. Verify: Shows "Select business unit"

---

### ✅ Check 12: Delete Option from Config

**Test:**
1. Edit Business Unit field in Form Config
2. Click [x] next to "Internal" option
3. Save
4. Go to Create RRF
5. Verify: "Internal" no longer appears in dropdown

---

### ✅ Check 13: Change Field from Required to Optional

**Test:**
1. Edit Business Unit in Form Config
2. Uncheck "Mandatory Field"
3. Save
4. Go to Create RRF
5. Verify: No asterisk (*) next to Business Unit
6. Submit form without selecting Business Unit
7. Expected: No validation error

---

## EXPECTED RESULTS SUMMARY

| Feature | Status |
|---------|--------|
| ✅ Business Unit visible in Form Config | PASS |
| ✅ No "Field Name (Programmatic)" input | PASS |
| ✅ Auto-generate fieldName from label | PASS |
| ✅ Technical fields hidden from UI | PASS |
| ✅ Dynamic option builder (no textarea) | PASS |
| ✅ Mandatory toggle integration | PASS |
| ✅ Dynamic fields render in Create form | PASS |
| ✅ Dynamic fields render in Edit form | PASS |
| ✅ Required field validation works | PASS |
| ✅ Backend receives dynamic fields | PASS |

---

## TROUBLESHOOTING

### Issue: Business Unit not appearing

**Solution:**
```powershell
# Check if field exists in DB
docker exec -it rrf_2-db-1 psql -U postgres -d rrf_portal -c "SELECT * FROM form_config;"

# If missing, run SQL script
docker exec -i rrf_2-db-1 psql -U postgres -d rrf_portal < Data/add-business-unit-field.sql
```

---

### Issue: Changes not reflecting in frontend

**Solution:**
```powershell
# Clear browser cache and reload
# Or hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)

# Check if backend is returning updated config
curl http://localhost:4000/form-config
```

---

### Issue: Validation not working

**Solution:**
1. Check browser console for errors
2. Verify `isRequired: true` in database
3. Check that validation loop in handleSubmit includes the field

---

## PRODUCTION READINESS CHECKLIST

- [ ] Business Unit field added and visible
- [ ] All technical fields hidden from admin UI
- [ ] Option builder UX is clean and intuitive
- [ ] AutofieldName generation tested
- [ ] Mandatory toggle working
- [ ] Create form shows all dynamic fields
- [ ] Edit form pre-fills all dynamic fields
- [ ] Validation enforces all required fields
- [ ] Backend receives all dynamic field values
- [ ] No hardcoded fields in ModernRRFForm.jsx

---

## SUCCESS CRITERIA

✅ **System is production-ready when:**
1. Admins can add unlimited fields via UI without touching code
2. Fields auto-render in correct form steps with proper styling
3. Required fields show asterisks and block submission if empty
4. All field values save to backend correctly
5. Edit mode pre-fills all dynamic fields
6. No technical jargon visible to non-technical admins
