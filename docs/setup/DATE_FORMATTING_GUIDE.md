# Date Formatting Standardization Guide

## ✅ Implementation Complete

The application now has **standardized date formatting** with:
- **Display Format:** DD-MM-YYYY (e.g., 16-04-2026)
- **Backend/Input Format:** YYYY-MM-DD (ISO 8601)
- **Calendar Picker:** Functional in all date input fields

---

## 📁 **Files Created/Updated**

### **1. Date Formatter Utility** ✅
**File:** `utils/dateFormatter.js`

Contains reusable functions:
- `formatDate()` - Convert to DD-MM-YYYY
- `formatDateTime()` - Convert to DD-MM-YYYY, HH:MM
- `convertToInputFormat()` - Convert DD-MM-YYYY to YYYY-MM-DD
- `getTodayFormatted()` - Get today in DD-MM-YYYY
- `getTodayInputFormat()` - Get today in YYYY-MM-DD
- `formatDateShort()` - Short format (16 Apr 2026)
- `isValidDateFormat()` - Validate DD-MM-YYYY format
- `daysBetween()` - Calculate days between dates
- `isPastDate()` / `isFutureDate()` - Date validation helpers

### **2. Updated Components** ✅
- `components/DateInput.jsx` - Native date picker with calendar
- `lib/api/rrfApi.js` - Uses formatDate for API responses
- `app/hiring-manager/view-rrf/[id]/page.jsx` - Example implementation

---

## 🚀 **How to Use**

### **1. Display Dates in UI (Tables, Cards, Views)**

```jsx
import { formatDate, formatDateTime, formatDateShort } from '@/utils/dateFormatter'

// Basic date display
<p>{formatDate(rrf.createdAt)}</p>
// Output: 16-04-2026

// Date with time
<p>{formatDateTime(rrf.submittedAt)}</p>
// Output: 16-04-2026, 14:30

// Short format for tables
<p>{formatDateShort(rrf.approvedAt)}</p>
// Output: 16 Apr 2026

// With fallback
<p>{formatDate(rrf.closedAt, 'Not closed')}</p>
// Output: Not closed (if null)
```

### **2. Date Input Fields (Forms)**

```jsx
import DateInput from '@/components/DateInput'
import { getTodayInputFormat } from '@/utils/dateFormatter'

// In your form component
<DateInput
  label="Billing Start Date"
  name="billingStartDate"
  value={formData.billingStartDate}  // YYYY-MM-DD format
  onChange={handleChange}
  required={true}
  minDate={getTodayInputFormat()}  // Today's date
/>
```

**Important:** 
- `value` must be in **YYYY-MM-DD** format for `<input type="date" />`
- Browser automatically shows DD-MM-YYYY to user based on locale
- Calendar picker opens when clicking the input

### **3. Converting User Input**

```jsx
import { convertToInputFormat } from '@/utils/dateFormatter'

// If user enters DD-MM-YYYY, convert to YYYY-MM-DD for backend
const userInput = "16-04-2026"
const backendFormat = convertToInputFormat(userInput)
// backendFormat = "2026-04-16"
```

### **4. Form Submission Example**

```jsx
import { formatDate, convertToInputFormat } from '@/utils/dateFormatter'

const handleSubmit = async (e) => {
  e.preventDefault()
  
  const payload = {
    positionTitle: formData.jobTitle,
    // Convert to YYYY-MM-DD for backend
    billingStartDate: formData.billingStartDate,  // Already in YYYY-MM-DD
    // Other fields...
  }
  
  await rrfApi.create(payload)
}
```

### **5. Display API Response Data**

```jsx
import { formatDate } from '@/utils/dateFormatter'

// In your component
const { rrf, loading, error } = useRRFDetail(id)

const rrfData = {
  submittedDate: formatDate(rrf.submittedAt),  // DD-MM-YYYY
  billingDate: formatDate(rrf.billingStartDate),
  // ...other fields
}

// In JSX
<p>Submitted: {rrfData.submittedDate}</p>
```

---

## 🔄 **Migration Steps for Existing Code**

### **Step 1: Find All Date Formatting**

Search for these patterns:
```bash
toLocaleDateString('en-GB')
toLocaleString('en-GB')
new Date().toISOString()
```

### **Step 2: Replace with formatDate()**

**Before:**
```jsx
date: new Date(rrf.createdAt).toLocaleDateString('en-GB')
```

**After:**
```jsx
import { formatDate } from '@/utils/dateFormatter'
date: formatDate(rrf.createdAt)
```

### **Step 3: Update Date Inputs**

**Before:**
```jsx
<input type="text" placeholder="DD/MM/YYYY" />
```

**After:**
```jsx
import DateInput from '@/components/DateInput'

<DateInput
  label="Select Date"
  name="myDate"
  value={formData.myDate}
  onChange={handleChange}
/>
```

### **Step 4: Update Tables/Dashboards**

**Before:**
```jsx
{new Date(rrf.createdAt).toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'short', 
  day: 'numeric' 
})}
```

**After:**
```jsx
import { formatDateShort } from '@/utils/dateFormatter'

{formatDateShort(rrf.createdAt)}
```

---

## 📝 **Quick Reference - Common Scenarios**

### Scenario 1: Display submission date
```jsx
import { formatDate } from '@/utils/dateFormatter'
<p>Submitted: {formatDate(rrf.submittedAt)}</p>
```

### Scenario 2: Date input with calendar
```jsx
import DateInput from '@/components/DateInput'
<DateInput
  label="Start Date"
  name="startDate"
  value={formData.startDate}
  onChange={handleChange}
  required
/>
```

### Scenario 3: Table date column
```jsx
import { formatDateShort } from '@/utils/dateFormatter'
<td>{formatDateShort(item.createdAt)}</td>
```

### Scenario 4: Datetime with timestamp
```jsx
import { formatDateTime } from '@/utils/dateFormatter'
<p>Approved: {formatDateTime(rrf.approvedAt)}</p>
```

### Scenario 5: Validate user input
```jsx
import { isValidDateFormat } from '@/utils/dateFormatter'
if (!isValidDateFormat(userInput)) {
  toast.error('Invalid date format. Use DD-MM-YYYY')
}
```

---

## 🎯 **Files to Update**

Run these searches in your codebase and replace with formatDate():

### **Priority 1: View Pages**
- ✅ `app/hiring-manager/view-rrf/[id]/page.jsx`
- `app/hr/view-rrf/[id]/page.jsx`
- `app/approver/view-rrf/[id]/page.jsx`
- `app/pmo/view-rrf/[id]/page.jsx`
- `app/admin/rrf-management/[id]/page.jsx`

### **Priority 2: List Pages**
- `app/hiring-manager/dashboard/page.jsx`
- `app/hr/closed/page.jsx`
- `app/pmo/closed/page.jsx`
- `app/pmo/sent-to-approvers/page.jsx`
- `app/hr/open-for-hiring/page.jsx`

### **Priority 3: Forms**
- `components/ModernRRFForm.jsx`
- `app/approver/edit-rrf/[id]/page.jsx`

---

## ✅ **Benefits**

1. **Consistency:** Same format across entire app
2. **Maintainability:** One place to change format (dateFormatter.js)
3. **Calendar Picker:** Native browser date picker works everywhere
4. **Backend Compatible:** YYYY-MM-DD format for API calls
5. **User Friendly:** DD-MM-YYYY display format
6. **Error Handling:** Graceful fallbacks for invalid dates
7. **Reusable:** Import once, use everywhere

---

## 🐛 **Troubleshooting**

### Issue: Calendar not showing
**Solution:** Ensure `type="date"` is used and value is in YYYY-MM-DD format

### Issue: Date shows as "Invalid Date"
**Solution:** Check if date string is valid before passing to formatDate()

### Issue: Wrong format in backend
**Solution:** Always send YYYY-MM-DD to backend using `<input type="date" />` value directly

---

## 🚀 **Next Steps**

1. **Apply changes to all view pages** (see Priority 1 list)
2. **Update dashboard tables** (see Priority 2 list)
3. **Update form inputs** (see Priority 3 list)
4. **Test date picker functionality** in all forms
5. **Rebuild Docker container** to apply changes

---

**Last Updated:** April 16, 2026  
**Status:** ✅ Core utility implemented, ready for global adoption
