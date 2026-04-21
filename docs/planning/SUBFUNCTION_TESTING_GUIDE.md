# Dynamic Subfunction Selection - Testing Guide

## Pre-Test Setup

### 1. Start Backend Server
```powershell
cd rrf-portal-backend
npm run start:dev
```

### 2. Seed Database
Open your browser and navigate to:
```
http://localhost:4000/seed
```

**Expected Output:**
```json
{
  "message": "Database seeded successfully"
}
```

**Check logs for:**
```
✓ Created subfunction: SGINTL (Delivery)
✓ Created subfunction: VR (Delivery)
✓ Created subfunction: PMO (Delivery)
✓ Created subfunction: BDE (Sales)
✓ Created subfunction: Sales (Sales)
✓ Created subfunction: MR (Sales)
✓ Created subfunction: Marketing (Sales)
✓ Created subfunction: Human Resources (Support)
✓ Created subfunction: Talent Acquisition (Support)
✓ Created subfunction: Accounts (Support)
✓ Created subfunction: IT Networking (Support)
```

### 3. Verify Subfunctions API
Test the new endpoint:
```powershell
# Get all subfunctions
curl http://localhost:4000/subfunctions

# Get subfunctions by function
curl "http://localhost:4000/subfunctions?function=Delivery"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "SGINTL",
      "function": "Delivery",
      "description": "SGINTL Delivery Team",
      "isActive": true,
      "displayOrder": 1,
      "createdAt": "2025-01-08T10:00:00.000Z",
      "updatedAt": "2025-01-08T10:00:00.000Z"
    },
    // ... more subfunctions
  ]
}
```

### 4. Start Frontend Server
```powershell
cd rrf-portal-nextjs
npm run dev
```

---

## Test Scenarios

### Test 1: Verify Subfunction Field Shows Only for APPROVER

**Steps:**
1. Login as Admin (`admin@sonarseeker.com` / `admin123`)
2. Navigate to **Admin > Users**
3. Click **"Add User"** button
4. Select different roles from the dropdown

**Expected Behavior:**
- ✅ When **Admin** is selected → No subfunction field appears
- ✅ When **PMO** is selected → No subfunction field appears
- ✅ When **HR Team** is selected → No subfunction field appears
- ✅ When **Hiring Manager** is selected → No subfunction field appears
- ✅ When **Approver** is selected → **Subfunction field appears** with checkboxes

**Subfunction field should show:**
- 11 checkboxes organized in 2 columns
- Each checkbox labeled with subfunction name and function type
- Example: "SGINTL (Delivery)"

---

### Test 2: Create APPROVER Without Subfunctions (Validation Test)

**Steps:**
1. Click **"Add User"**
2. Fill in:
   - User ID: `approver-test-001`
   - Full Name: `Test Approver`
   - Email: `test.approver@company.com`
   - Password: `test123`
   - Role: **Approver**
   - Do NOT select any subfunctions
3. Click **"Create User"**

**Expected Behavior:**
- ❌ Form should NOT submit
- ⚠️ Error message: "Select at least one subfunction for APPROVER role"
- Red validation border around subfunction field

---

### Test 3: Create APPROVER With Subfunctions (Success Case)

**Steps:**
1. Click **"Add User"**
2. Fill in:
   - User ID: `approver-sgintl`
   - Full Name: `John Doe`
   - Email: `john.doe@company.com`
   - Password: `test123`
   - Role: **Approver**
   - Department: `Delivery`
   - **Select subfunctions:** ✅ SGINTL, ✅ PMO
3. Click **"Create User"**

**Expected Behavior:**
- ✅ Success toast: "User created successfully"
- ✅ Modal closes
- ✅ User appears in the table
- ✅ User row shows "Approver" role badge (gold color)

**Backend Verification:**
Check database directly:
```sql
-- Check user was created
SELECT id, user_id, full_name, email FROM users WHERE user_id = 'approver-sgintl';

-- Check subfunctions were assigned
SELECT us.id, u.user_id, s.name, s.function
FROM user_subfunctions us
JOIN users u ON u.id = us.user_id
JOIN subfunctions s ON s.id = us.subfunction_id
WHERE u.user_id = 'approver-sgintl';
```

**Expected Database Result:**
```
 id | user_id          | subfunction_name | function
----|------------------|------------------|---------
  1 | approver-sgintl  | SGINTL           | Delivery
  2 | approver-sgintl  | PMO              | Delivery
```

---

### Test 4: Create Non-APPROVER User (No Subfunction Required)

**Steps:**
1. Click **"Add User"**
2. Fill in:
   - User ID: `hr-002`
   - Full Name: `Sarah HR`
   - Email: `sarah.hr@company.com`
   - Password: `test123`
   - Role: **HR Team**
   - Department: `Human Resources`
3. Click **"Create User"**

**Expected Behavior:**
- ✅ No subfunction field appears
- ✅ User created successfully without subfunctions
- ✅ Backend should not store any user_subfunctions records

---

### Test 5: Edit User and Change Role to APPROVER

**Steps:**
1. Find the user `hr-002` in the table
2. Click the **Edit** icon
3. Change **Role** from "HR Team" to **"Approver"**
4. **Subfunction field should now appear**
5. Select subfunctions: ✅ Human Resources, ✅ Talent Acquisition
6. Click **"Save Changes"**

**Expected Behavior:**
- ✅ Subfunction field dynamically appears when role changed to APPROVER
- ✅ Validation requires at least one subfunction
- ✅ User updated successfully
- ✅ Database reflects new role and subfunctions

---

### Test 6: Edit APPROVER and Remove All Subfunctions (Validation Test)

**Steps:**
1. Edit user `approver-sgintl`
2. Uncheck all subfunctions
3. Click **"Save Changes"**

**Expected Behavior:**
- ❌ Form should NOT submit
- ⚠️ Error: "Select at least one subfunction for APPROVER role"

---

### Test 7: Edit APPROVER and Change Role to Non-APPROVER

**Steps:**
1. Edit user `approver-sgintl`
2. Change role from "Approver" to **"Hiring Manager"**
3. Notice subfunction field disappears
4. Click **"Save Changes"**

**Expected Behavior:**
- ✅ Subfunction field disappears when role changes
- ✅ User updated successfully
- ✅ Backend should clear all user_subfunctions for this user

**Database Verification:**
```sql
SELECT * FROM user_subfunctions WHERE user_id = (
  SELECT id FROM users WHERE user_id = 'approver-sgintl'
);
```

**Expected:** 0 rows (subfunctions should be cleared)

---

### Test 8: API Response Includes Subfunctions in User List

**Steps:**
1. Create multiple users with different subfunctions
2. Open browser DevTools > Network tab
3. Navigate to **Admin > Users** page
4. Check the API response from `GET /users`

**Expected Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "userId": "approver-sgintl",
      "fullName": "John Doe",
      "email": "john.doe@company.com",
      "role": {
        "id": 3,
        "roleCode": "APPROVER",
        "roleName": "Approver"
      },
      "subfunctions": [
        {
          "id": 1,
          "name": "SGINTL",
          "function": "Delivery"
        },
        {
          "id": 3,
          "name": "PMO",
          "function": "Delivery"
        }
      ]
    },
    // ... other users
  ]
}
```

---

### Test 9: Multi-Function Subfunction Selection

**Steps:**
1. Create an approver with subfunctions from **multiple functions**:
   - User ID: `approver-multi`
   - Role: Approver
   - Subfunctions: ✅ SGINTL (Delivery), ✅ BDE (Sales), ✅ HR (Support)
2. Save the user

**Expected Behavior:**
- ✅ User created successfully
- ✅ All 3 subfunctions saved (from different parent functions)
- ✅ No conflicts or validation errors

---

### Test 10: Display User's Subfunctions in Table (Enhancement)

**Optional UI Enhancement:**

Add a "Subfunctions" column to the users table:

```jsx
{
  title: 'Subfunctions',
  dataIndex: 'subfunctions',
  key: 'subfunctions',
  render: (subfunctions, record) => {
    if (record.role?.roleCode !== 'APPROVER' || !subfunctions?.length) {
      return <span className="text-gray-400">—</span>
    }
    return (
      <div className="flex flex-wrap gap-1">
        {subfunctions.map(sf => (
          <Tag key={sf.id} size="small" color="blue">
            {sf.name}
          </Tag>
        ))}
      </div>
    )
  },
}
```

**Expected Behavior:**
- ✅ APPROVER users show their assigned subfunctions as tags
- ✅ Non-APPROVER users show "—"

---

## Common Issues & Troubleshooting

### Issue 1: Subfunction Field Doesn't Appear

**Cause:** Frontend not fetching subfunctions
**Fix:** 
1. Check browser console for errors
2. Verify `GET /subfunctions` returns data
3. Check `subfunctions` state is populated

### Issue 2: Validation Not Working

**Cause:** Form validation not triggered
**Fix:**
1. Ensure `rules` array contains required validation
2. Check `shouldUpdate` dependency is tracking roleId changes

### Issue 3: Subfunctions Not Saved

**Cause:** Backend not receiving subfunctionIds
**Fix:**
1. Check Network tab > Payload includes `subfunctionIds: [1, 3]`
2. Verify `CreateUserDto` accepts `subfunctionIds` field
3. Check backend logs for validation errors

### Issue 4: Database Seeding Failed

**Cause:** Subfunction entity not in seed module
**Fix:**
1. Verify `seed.module.ts` imports Subfunction entity
2. Check `seed.service.ts` has Subfunction repository injected
3. Restart backend server

---

## Acceptance Criteria

✅ **Backend:**
- [ ] GET /subfunctions returns 11 subfunctions
- [ ] POST /users with APPROVER + subfunctionIds saves correctly
- [ ] POST /users with APPROVER without subfunctionIds returns 400 error
- [ ] PUT /users updates subfunctions correctly
- [ ] User list API includes subfunctions in response

✅ **Frontend:**
- [ ] Subfunction field appears ONLY when APPROVER role is selected
- [ ] Subfunction field disappears when role changed from APPROVER
- [ ] Can select multiple subfunctions via checkboxes
- [ ] Validation prevents creating APPROVER without subfunctions
- [ ] Edit form pre-populates existing subfunctions
- [ ] Success/error toasts display appropriately

✅ **Database:**
- [ ] 11 records in `subfunctions` table
- [ ] User-subfunction mappings in `user_subfunctions` table
- [ ] Cascade delete works (deleting user removes their subfunctions)

---

## Performance Tests

### Load Test: Create 100 APPROVER Users

**Script:**
```javascript
// Test script to create multiple users
for (let i = 1; i <= 100; i++) {
  await usersApi.create({
    userId: `approver-${i}`,
    fullName: `Approver ${i}`,
    email: `approver${i}@company.com`,
    password: 'test123',
    roleId: 3, // APPROVER
    subfunctionIds: [1, 2], // SGINTL, VR
  })
}
```

**Expected:**
- ✅ All 100 users created successfully
- ✅ 200 user_subfunction records created (100 users × 2 subfunctions)
- ✅ No duplicate constraint violations

---

## Next Steps (Future Enhancements)

1. **RRF Filtering for Approvers:**
   - Modify `rrf.service.ts` to filter RRFs by approver's subfunctions
   - Approver with `SGINTL` only sees RRFs where `subFunction = 'SGINTL'`

2. **Subfunction Management UI:**
   - Admin page to add/edit/disable subfunctions
   - Bulk assign subfunctions to multiple users

3. **Audit Logging:**
   - Track when subfunctions are assigned/removed
   - Log which admin made the change

4. **Auto-Assign Approvers:**
   - When RRF is created with `subFunction = 'SGINTL'`
   - Auto-assign all approvers with SGINTL subfunction

---

## Success Metrics

✅ **Feature Complete When:**
- All 10 test scenarios pass
- No console errors during user creation/editing
- Database constraints working (unique, cascade delete)
- UI/UX is smooth and intuitive
- Validation messages are clear
- Role-based filtering works correctly

---

## Contact & Support

If you encounter issues:
1. Check browser console for errors
2. Check backend logs in terminal
3. Verify database seeding completed successfully
4. Review this testing guide for troubleshooting steps
