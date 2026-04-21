# Plan: Unified Dynamic Requests System Across All Roles

## TL;DR
Extend the Hiring Manager's successful tab-based requests classification system to all roles (PMO, HR, Approver) using a dynamic, API-driven approach. Dashboard statistic cards will automatically generate request page tabs, eliminating hardcoded data. This creates reusable components for tabs, tables, and filtering that work across all roles with a single centralized status configuration.

**Recommended Approach:** Extract working pattern from Hiring Manager → Create centralized config + reusable components → Build role-specific pages → Integrate with dashboards and navigation.

---

## Architecture Foundation

**Status Configuration** (`lib/config/statusConfig.js`)
- Centralized single source of truth for all status mappings
- Maps backend status enums to UI display (labels, colors, icons, filters)
- Role-specific configurations defining which statuses each role sees
- Utility functions: `getStatusConfig(role)`, `statisticsToTabs(statistics, role)`
- Supports both old and new backend status formats for compatibility

**Data Flow:**
1. Dashboard fetches statistics from `/rrf/statistics` API
2. Statistics contain `byStatus` object with counts for each status
3. `statisticsToTabs()` converts backend data to UI tabs dynamically
4. StatCards use `href` prop to navigate to requests with `?status=X` query param
5. Request page reads query param, filters data, displays in tabs

---

## Steps

**Phase 1: Create Architecture Foundation** (*blocks everything*)
1. Create `lib/config/statusConfig.js` with centralized status mappings
   - Define `BASE_STATUSES` object (status key → label, color, icon, backend status keys)
   - Define `ROLE_STATUS_CONFIG` for each role (hiring-manager, approver, pmo, hr)
   - Export `getStatusConfig(role)` - returns array of tab configs for role
   - Export `statisticsToTabs(statistics, role)` - converts API stats to tabs with counts
   - Export `getStatusFilterFn(tabKey)` - returns filter function for tab
   - Map both camelCase and kebab-case backend status formats

**Phase 2: Create Reusable Component Library** (*depends on Phase 1*)
2. Create `components/requests/RequestTabs.jsx` - Dynamic tab navigation
   - Props: `tabs` (from statisticsToTabs), `activeTab`, `onTabChange`, `loading`
   - Renders tab bar with counts from statistics
   - Highlights active tab based on URL query param
   - Fully responsive (horizontal scroll on mobile)

3. Create `components/requests/RequestTable.jsx` - Unified data table
   - Props: `data`, `loading`, `role`, `onRowClick`, `searchTerm`, `exportConfig`
   - Displays RRF list with status badges, priority badges, actions
   - Built-in search filtering across all visible columns
   - Export functionality (CSV, Excel, PDF) with role-specific columns
   - Responsive table (cards on mobile, table on desktop)
   - Uses same badge styling as existing pages (consistency)

4. Create `components/requests/StatusCards.jsx` - Dashboard card generator
   - Props: `statistics`, `role`, `baseHref`
   - Dynamically generates StatCard grid from statistics
   - Uses statusConfig to determine colors and icons
   - Each card links to `{baseHref}?status={statusKey}`

**Phase 3: Create Generalized Hook** (*parallel with Phase 2*)
5. Create `hooks/useRoleRequests.js` - Generalized requests fetching
   - Props: `role` ('hiring-manager' | 'approver' | 'pmo' | 'hr')
   - Routes to correct API endpoint based on role:
     - hiring-manager → `/rrf/my-requests`
     - approver → `/rrf/pending-approvals` (or getAll with filters)
     - pmo → `/rrf/open-positions` or getAll with filters
     - hr → `/rrf/open-for-hiring`
   - Uses `useSmartFetch` for caching and deduplication
   - Returns: `{ requests, loading, error, refresh }`
   - Transforms data to common format using existing `formatRrfListForDisplay`

**Phase 4: Create Role-Specific Request Pages** (*depends on Phases 1-3*)
6. Create `app/approver/requests/page.jsx`
   - Fetch statistics with `useRRFStatistics(true)`
   - Fetch requests with `useRoleRequests('approver')`
   - Convert statistics to tabs with `statisticsToTabs(statistics, 'approver')`
   - Use RequestTabs + RequestTable components
   - Tab filtering based on statusConfig
   - Search and export functionality
   - Tabs: All, Pending, Approved, Declined, On Hold

7. Create `app/pmo/requests/page.jsx`
   - Similar structure to approver
   - Use `useRoleRequests('pmo')`
   - Tabs: All, Opened, Sent to HR, Closed
   - Special handling for PMO-specific statuses

8. Create `app/hr/requests/page.jsx`
   - Similar structure
   - Use `useRoleRequests('hr')`
   - Tabs: All, Open for Hiring, Closed
   - HR-specific columns (date sent, positions filled)

9. **OPTIONAL:** Refactor `app/hiring-manager/my-requests/page.jsx`
   - Replace hardcoded tabs with `statisticsToTabs`
   - Replace custom table with RequestTable component
   - Maintains 100% backward compatibility
   - Reduces code by ~40% (removes duplicate logic)

**Phase 5: Integrate Dashboards** (*depends on Phase 1, parallel with Phase 4*)
10. Update `app/approver/page.jsx`
    - Cards already have `href` props - verify they point to `/approver/requests?status=X`
    - Update if currently pointing to old pages like `/approver/pending`

11. Update `app/pmo/page.jsx`
    - Cards already have `href` props - verify they point to `/pmo/requests?status=X`
    - Update if pointing to old routes like `/pmo/open-positions`

12. Update `app/hr/page.jsx`
    - Add `href` props to StatCards if missing
    - Point to `/hr/requests?status=X`

13. Update `app/admin/page.jsx` (*optional - if admin should see unified view*)
    - Add `href` props to StatCards
    - Point to `/admin/requests?status=X` (if admin requests page created)

**Phase 6: Update Sidebar Navigation** (*parallel with Phase 5*)
14. Update `components/PermissionBasedSidebar.jsx`
    - Add "Requests" menu item for Approver: `/approver/requests`
    - Add "Requests" menu item for PMO: `/pmo/requests`
    - Add "Requests" menu item for HR: `/hr/requests`
    - Verify Hiring Manager already has "Requests" link (currently labeled "Requests")
    - Use `FileTextOutlined` icon for consistency

**Phase 7: API Verification** (*parallel with all phases*)
15. Verify existing API endpoints return data in expected format
    - `/rrf/statistics` returns `{ byStatus: {...} }`
    - `/rrf/my-requests` returns array of RRFs
    - `/rrf/pending-approvals` returns array of RRFs
    - `/rrf/open-positions` returns array of RRFs
    - `/rrf/open-for-hiring` returns array of RRFs

16. **Note:** PMO "Fill from Bench" already fully implemented in `app/pmo/view-rrf/[id]/page.jsx` - no work needed

---

## Relevant Files

**New Files to Create:**
- `lib/config/statusConfig.js` - Status configuration and utilities
- `components/requests/RequestTabs.jsx` - Reusable tab component
- `components/requests/RequestTable.jsx` - Reusable table component
- `components/requests/StatusCards.jsx` - Dashboard card generator (*optional*)
- `hooks/useRoleRequests.js` - Generalized requests hook
- `app/approver/requests/page.jsx` - Approver requests page
- `app/pmo/requests/page.jsx` - PMO requests page
- `app/hr/requests/page.jsx` - HR requests page

**Files to Modify:**
- `components/PermissionBasedSidebar.jsx` - Add "Requests" menu items
- `app/approver/page.jsx` - Update StatCard href props (verify)
- `app/pmo/page.jsx` - Update StatCard href props (verify)
- `app/hr/page.jsx` - Update StatCard href props (verify)
- `app/hiring-manager/my-requests/page.jsx` - Optional refactor to use reusable components

**Reference Files (No Changes):**
- `app/hiring-manager/my-requests/page.jsx` (lines 1-200) - Reference pattern for tabs and filtering
- `app/hiring-manager/dashboard/page.jsx` (lines 120-150) - Reference for StatCard with href
- `components/StatCard.jsx` - Already supports href prop
- `lib/api/rrfApi.js` - All required API methods exist
- `hooks/useRRFStatistics.js` - Statistics fetching hook
- `hooks/useMyRequests.js` - Reference for creating useRoleRequests
- `lib/useSmartFetch.js` - Caching and deduplication utility
- `app/pmo/view-rrf/[id]/page.jsx` (lines 150-220) - "Fill from Bench" already implemented

---

## Verification

**After Phase 1-2:**
1. Import `statusConfig` in any page - verify exports work
2. Call `statisticsToTabs(mockStats, 'approver')` - returns correct tab array
3. Render `<RequestTabs tabs={tabs} />` - displays tabs with counts

**After Phase 4:**
1. Navigate to `/approver/requests` - page loads with tabs
2. Click tab "Pending" - URL updates to `?status=pending`, table filters
3. Search in table - results filter correctly
4. Click "Export CSV" - downloads filtered data
5. Navigate to `/pmo/requests` and `/hr/requests` - verify same behavior

**After Phase 5-6:**
1. Navigate to approver dashboard - click "Pending Approvals" card
2. Redirects to `/approver/requests?status=pending` with filtered view
3. Check sidebar - "Requests" menu item visible for Approver, PMO, HR
4. Click sidebar "Requests" - navigates to correct page

**End-to-End:**
1. Login as Approver → Dashboard shows statistics cards
2. Click "Approved" card → Navigates to `/approver/requests?status=approved`
3. See only approved RRFs in table, tab shows count matching card
4. Search for specific RRF ID → Table filters
5. Export to CSV → Downloads approved RRFs only
6. Click sidebar "Requests" → Returns to all requests, "All" tab active
7. Repeat for PMO and HR roles

**Performance:**
1. Network tab: Only 2 API calls per requests page (statistics + requests)
2. No duplicate fetches (useSmartFetch prevents double-mounting)
3. Tab switches: Instant (client-side filtering, no API calls)
4. Search filtering: < 100ms for 1000 records

---

## Decisions

**Technology Choices:**
- Use existing `useSmartFetch` hook for caching/deduplication (no new dependencies)
- Use query parameters for tab state (shareable URLs, browser back/forward works)
- Extract reusable components instead of duplicating code across 4 pages
- Keep existing badge styling and table layouts (visual consistency)

**Status Mapping Strategy:**
- Support both backend formats (camelCase from new enum, kebab-case from old)
- Map multiple backend statuses to single UI tab when needed (e.g., "pending" + "submitted" → "Pending Approval")
- Role-specific tab configurations (each role sees relevant statuses only)

**API Integration:**
- Reuse existing endpoints (no backend changes required)
- Use `getAll()` with filters for roles without dedicated endpoints
- Transform responses to common format in hook (consistency across roles)

**Navigation Pattern:**
- Dashboard cards use `href` prop on StatCard (already implemented for Hiring Manager)
- Query parameter pattern: `/role/requests?status=statusKey`
- Sidebar "Requests" menu item goes to `/role/requests` (no query param = "All" tab)

**Backward Compatibility:**
- Hiring Manager page can be refactored but keep old structure as fallback
- Old approver/pmo/hr pages (e.g., `/approver/pending`) can remain but deprecated
- StatusConfig supports legacy backend status formats

---

## Further Considerations

1. **Should Admin have a unified requests page?**
   - **Option A**: Create `/admin/requests` showing all RRFs across all users (requires `getStatistics(true)`)
   - **Option B**: Keep admin dashboard as-is, admin navigates to other role views via user management
   - **Recommendation**: Option A if admin needs RRF management, Option B to keep admin focused on user/system management

2. **Should old role-specific pages be deprecated or removed?**
   - Existing: `/approver/pending`, `/approver/approved`, `/pmo/open-positions`, etc.
   - **Option A**: Remove old pages after migration (cleaner, but breaking change)
   - **Option B**: Keep old pages, redirect to new unified page with query param
   - **Option C**: Keep old pages as-is, add new unified page (parallel routes)
   - **Recommendation**: Option B (redirects) for smooth migration, then Option A after verification

3. **Should RequestTable support inline actions (approve/decline/delete)?**
   - Currently: Click row → Navigate to detail page → Perform action
   - Alternative: Add action buttons in table row (faster workflow)
   - **Option A**: Keep current flow (less clutter, standard pattern)
   - **Option B**: Add inline actions for common workflows (e.g., Approve/Decline for approver)
   - **Recommendation**: Option A for consistency, Option B as future enhancement

4. **Export Configuration - Which columns for each role?**
   - Hiring Manager: ID, Role, Sub-Function, Project, Positions, Priority, Status, Created Date
   - Approver: ID, Role, Project, Hiring Manager, Positions, Priority, Status, Submitted Date
   - PMO: ID, Role, Project, Approved By, Positions, Status, Approved Date, Opened Date
   - HR: ID, Role, Project, Positions, Status, Opened Date, Closed Date, Candidate Name
   - **Action Needed**: Define column sets in statusConfig or RequestTable props

5. **Mobile Optimization - Tab overflow handling?**
   - With 7+ tabs, horizontal scrolling needed on mobile
   - **Option A**: Horizontal scroll (current Hiring Manager approach)
   - **Option B**: Dropdown selector for tabs on mobile
   - **Recommendation**: Option A (simpler, already working)
