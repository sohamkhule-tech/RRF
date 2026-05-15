# Entity Integrity, Schema Rebuild Readiness & Migration Adoption Audit
**Project:** RRF Portal Backend (NestJS + TypeORM + PostgreSQL)  
**Date:** May 11, 2026  
**Context:** Staging database exists with manual-SQL-applied history. No live business users. Rebuild is potentially feasible.  
**Constraint:** Read-only analysis. No code changes, no migrations generated, no SQL executed.

---

## Table of Contents

- [A. Entity Inventory](#a-entity-inventory)
- [B. Entity Completeness Audit](#b-entity-completeness-audit)
- [C. Relationship Integrity Audit](#c-relationship-integrity-audit)
- [D. SQL Dependency Audit](#d-sql-dependency-audit)
- [E. Migration History Audit](#e-migration-history-audit)
- [F. Schema Drift Analysis](#f-schema-drift-analysis)
- [G. Schema Rebuild Readiness](#g-schema-rebuild-readiness)
- [H. Seeding Readiness](#h-seeding-readiness)
- [I. Safe Migration Adoption Strategy](#i-safe-migration-adoption-strategy)
- [J. Testing & Validation Strategy](#j-testing--validation-strategy)
- [K. Final Recommendation](#k-final-recommendation)

---

## A. Entity Inventory

13 entity classes found across 11 tables (2 entities map to the same `notifications` table concept):

| # | Class | Table | File |
|---|-------|-------|------|
| 1 | `Role` | `roles` | `src/roles/role.entity.ts` |
| 2 | `Module` | `modules` | `src/modules/module.entity.ts` |
| 3 | `Permission` | `permissions` | `src/permissions/permission.entity.ts` |
| 4 | `RolePermission` | `role_permissions` | `src/role-permissions/role-permission.entity.ts` |
| 5 | `User` | `users` | `src/users/user.entity.ts` |
| 6 | `Function` | `functions` | `src/functions/function.entity.ts` |
| 7 | `Subfunction` | `subfunctions` | `src/subfunctions/subfunction.entity.ts` |
| 8 | `UserSubfunction` | `user_subfunctions` | `src/user-subfunctions/user-subfunction.entity.ts` |
| 9 | `Rrf` | `rrfs` | `src/rrf/entities/rrf.entity.ts` |
| 10 | `RrfApprover` | `rrf_approvers` | `src/rrf/entities/rrf-approver.entity.ts` |
| 11 | `RrfFormConfig` | `rrf_form_configs` | `src/rrf/entities/rrf-form-config.entity.ts` |
| 12 | `Notification` | `notifications` | `src/notifications/notification.entity.ts` |
| 13 | `JobDescription` | `job_descriptions` | `src/job-descriptions/job-description.entity.ts` |

**Missing entity noted:** There is no `typeorm_cache` entity. However, `typeorm.config.ts` configures `cache: { type: 'database', tableName: 'typeorm_cache' }`. TypeORM creates this table automatically when cache is enabled. It is not user-managed but will be auto-created on first use if the runtime config (not `data-source.ts`) is active.

---

## B. Entity Completeness Audit

### B.1 `roles` — ✅ COMPLETE

```
Table:       roles
PK:          id (SERIAL)
Columns:     role_name VARCHAR(50) UNIQUE, role_code VARCHAR(20) UNIQUE,
             description TEXT nullable, priority INT default 0,
             is_active BOOL default true, created_at, updated_at
Indexes:     @Index(['isActive'])
Enums:       None
JSONB:       None
Relations:   None declared (referenced by User, RolePermission)
Nullability: Only description is nullable
Timestamps:  ✅ CreateDateColumn + UpdateDateColumn
```

**Assessment:** Complete. Can reconstruct table from entity alone.

---

### B.2 `modules` — ✅ COMPLETE

```
Table:       modules
PK:          id (SERIAL)
Columns:     module_name VARCHAR(100) UNIQUE, module_code VARCHAR(50) UNIQUE,
             description TEXT nullable, parent_module_id INT nullable (self-ref, NOT declared as FK),
             route_path VARCHAR(255) nullable, icon VARCHAR(50) nullable,
             display_order INT default 0, is_active BOOL default true,
             created_at, updated_at
Indexes:     @Index(['isActive'])
Relations:   parent_module_id is a plain @Column — self-referencing FK NOT declared
```

**Assessment:** Complete for basic schema. One design note: `parent_module_id` is declared as a plain integer column, not a `@ManyToOne` self-relation. This means TypeORM will create the column but NOT a foreign key constraint to `modules(id)`. The column exists and can store values, but referential integrity is not enforced at the DB level. **This is intentional or an oversight — not a blocker for rebuild.**

---

### B.3 `permissions` — ✅ COMPLETE

```
Table:       permissions
PK:          id (SERIAL)
Columns:     module_id INT FK→modules, permission_name VARCHAR(100),
             permission_code VARCHAR(50), description TEXT nullable,
             is_active BOOL default true, created_at, updated_at
Indexes:     @Index(['moduleId']), @Index(['isActive'])
Unique:      @Unique(['moduleId', 'permissionCode']) → composite unique constraint
Relations:   ManyToOne → Module (no cascade, no inverse declared)
```

**Assessment:** Complete. The `@Unique` composite constraint is critical for the `ON CONFLICT (module_id, permission_code) DO NOTHING` pattern used in all SQL seed files.

---

### B.4 `role_permissions` — ✅ COMPLETE

```
Table:       role_permissions
PK:          id (SERIAL)
Columns:     role_id INT FK→roles, permission_id INT FK→permissions,
             granted_at TIMESTAMP default CURRENT_TIMESTAMP,
             created_at
Indexes:     @Index(['roleId']), @Index(['permissionId'])
Unique:      @Unique(['roleId', 'permissionId']) → composite unique constraint
Relations:   ManyToOne → Role, ManyToOne → Permission (no cascade, no inverse)
```

**Assessment:** Complete. No `updated_at` — intentional for a join table. The `granted_at` redundancy with `created_at` is harmless.

---

### B.5 `users` — ⚠️ ONE COLUMN DRIFT

```
Table:       users
PK:          id (SERIAL)
Columns:     user_id VARCHAR(50) UNIQUE, email VARCHAR(100) UNIQUE,
             password_hash VARCHAR(255), full_name VARCHAR(100),
             department VARCHAR(100) nullable, phone VARCHAR(20) nullable,
             is_active BOOL default true, last_login TIMESTAMP nullable,
             role_id FK→roles,
             technologies JSONB nullable default '[]'::jsonb,  ← DRIFT RISK
             created_at, updated_at
Indexes:     @Index(['email']), @Index(['userId'])
Relations:   ManyToOne → Role (eager: true), OneToMany → UserSubfunction
```

**Assessment:** One column at risk. `technologies` (JSONB) has no SQL history file and was added directly to the entity. It is almost certainly **missing from the staging DB**. All other columns are confirmed via seed history. Entity is otherwise complete.

---

### B.6 `functions` — ✅ COMPLETE

```
Table:       functions
PK:          id (SERIAL)
Columns:     name VARCHAR(100) UNIQUE, description TEXT nullable,
             is_active BOOL default true, display_order INT default 0,
             created_at, updated_at
Indexes:     @Index(['name'], { unique: true }), @Index(['isActive'])
Relations:   OneToMany → Subfunction (inverse of functionEntity)
```

**Assessment:** Complete. Matches `add-functions-table.sql` exactly.

---

### B.7 `subfunctions` — ⚠️ TRANSITIONAL COLUMN PRESENT

```
Table:       subfunctions
PK:          id (SERIAL)
Columns:     name VARCHAR(100) UNIQUE, function VARCHAR(100) nullable (DEPRECATED),
             function_id INT nullable FK→functions (NEW),
             description TEXT nullable, is_active BOOL default true,
             display_order INT default 0, created_at, updated_at
Indexes:     @Index(['name'], { unique: true }), @Index(['isActive'])
Relations:   ManyToOne → Function (eager: true, JoinColumn: function_id)
```

**Assessment:** Contains a **migration-in-progress pattern** — both old `function` (text) column and new `function_id` (FK) column coexist, with a comment saying "Remove this after migration is complete." The entity **intentionally retains the old column for backward compatibility**. A fresh rebuild would create both columns, which is correct and matches current staging schema from `add-functions-table.sql`.

---

### B.8 `user_subfunctions` — ✅ COMPLETE

```
Table:       user_subfunctions
PK:          id (SERIAL)
Columns:     user_id INT FK→users (CASCADE DELETE), subfunction_id INT FK→subfunctions (CASCADE DELETE),
             assigned_at TIMESTAMP (via CreateDateColumn)
Indexes:     @Index(['userId', 'subfunctionId'], { unique: true }) → composite unique
Relations:   ManyToOne → User (onDelete: CASCADE), ManyToOne → Subfunction (onDelete: CASCADE, eager)
Cascade:     DELETE propagates from users and subfunctions
```

**Assessment:** Complete. The unique index on (user_id, subfunction_id) prevents duplicate assignments. `onDelete: CASCADE` is explicitly set — will be reflected in the generated FK constraints.

---

### B.9 `rrfs` — ⚠️ COMPLEX — VERIFY ENUM TYPES

```
Table:       rrfs
PK:          id (SERIAL)
Unique:      sub_id VARCHAR(20), rrf_number VARCHAR(20), internal_rrf_no VARCHAR(50)
Enums:       RrfStatus (11 values), Priority (3 values), EmploymentType (3 values), RequisitionType (2 values)
JSONB:       interview_panel JSONB default '[]'::jsonb, status_history JSONB default '[]'::jsonb
Decimals:    experience_min/max DECIMAL(3,1), budget_min/max DECIMAL(12,2), billing_rate DECIMAL(10,2)
Timestamps:  submitted_at, approved_at, sent_to_hr_at, rejected_at, declined_at, closed_at,
             billing_start_date, expected_onboarding_date, joining_date, last_edited_at,
             created_at, updated_at
FKs (nullable): created_by_id, pmo_verified_by_id, assigned_to_hr_id, approved_by_id,
                declined_by_id, on_hold_by_id, closed_by_id, last_edited_by_id, subfunction_id
Denormalized: approved_by_name, declined_by_name, on_hold_by_name VARCHAR(255)
Indexes:    rrfNumber, status, createdById, department, createdAt
Relations:  ManyToOne → User (×8), ManyToOne → Subfunction, OneToMany → RrfApprover
```

**Full column list for `rrfs`:**

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | SERIAL | No | auto | PK |
| sub_id | VARCHAR(20) | Yes | — | UNIQUE |
| rrf_number | VARCHAR(20) | Yes | — | UNIQUE |
| position_title | VARCHAR(200) | No | — | Required |
| department | VARCHAR(100) | Yes | — | |
| entity | VARCHAR(100) | Yes | — | |
| organisation | VARCHAR(100) | Yes | — | |
| requisition_type | ENUM | Yes | — | |
| customer_name | VARCHAR(200) | Yes | — | |
| non_billable_sub_type | VARCHAR(50) | Yes | — | |
| function | VARCHAR(100) | Yes | — | text field, not FK |
| sub_function | VARCHAR(100) | Yes | — | text field, not FK |
| subfunction_id | INT | Yes | — | FK → subfunctions |
| project_name | VARCHAR(200) | Yes | — | |
| headcount | INT | No | 1 | |
| priority | ENUM | No | MEDIUM | |
| status | ENUM | No | DRAFT | 11-value enum |
| job_description | TEXT | Yes | — | |
| required_skills | TEXT | Yes | — | |
| preferred_skills | TEXT | Yes | — | |
| technologies | TEXT | Yes | — | plain text, NOT JSONB |
| interview_panel | JSONB | Yes | '[]'::jsonb | |
| experience_min | DECIMAL(3,1) | Yes | — | |
| experience_max | DECIMAL(3,1) | Yes | — | |
| budget_min | DECIMAL(12,2) | Yes | — | |
| budget_max | DECIMAL(12,2) | Yes | — | |
| position_type | VARCHAR(50) | Yes | — | |
| work_mode | VARCHAR(50) | Yes | — | |
| employment_type | ENUM | No | FULL_TIME | |
| location | VARCHAR(200) | Yes | — | |
| urgency_reason | TEXT | Yes | — | |
| billing_rate | DECIMAL(10,2) | Yes | — | |
| billing_currency | VARCHAR(10) | Yes | — | |
| billing_start_date | TIMESTAMP | Yes | — | |
| expected_onboarding_date | TIMESTAMP | Yes | — | |
| created_by_id | INT | No | — | FK → users |
| pmo_verified_by_id | INT | Yes | — | FK → users |
| assigned_to_hr_id | INT | Yes | — | FK → users |
| submitted_at | TIMESTAMP | Yes | — | |
| approved_at | TIMESTAMP | Yes | — | |
| sent_to_hr_at | TIMESTAMP | Yes | — | |
| approved_by_id | INT | Yes | — | FK → users |
| approved_by_name | VARCHAR(255) | Yes | — | denormalized |
| rejected_at | TIMESTAMP | Yes | — | |
| declined_at | TIMESTAMP | Yes | — | |
| declined_by_id | INT | Yes | — | FK → users |
| declined_by_name | VARCHAR(255) | Yes | — | denormalized |
| decline_reason | TEXT | Yes | — | |
| on_hold_by_id | INT | Yes | — | FK → users |
| on_hold_by_name | VARCHAR(255) | Yes | — | denormalized |
| closed_at | TIMESTAMP | Yes | — | |
| closed_by_id | INT | Yes | — | FK → users |
| candidate_name | VARCHAR(255) | Yes | — | |
| joining_date | TIMESTAMP | Yes | — | |
| closure_status | VARCHAR(255) | Yes | — | |
| close_reason | VARCHAR(50) | Yes | — | |
| internal_rrf_no | VARCHAR(50) | Yes | — | UNIQUE |
| notes | TEXT | Yes | — | |
| status_history | JSONB | Yes | '[]'::jsonb | |
| last_edited_by_id | INT | Yes | — | FK → users |
| last_edited_by_role | VARCHAR(50) | Yes | — | |
| last_edited_at | TIMESTAMP | Yes | — | |
| business_unit | VARCHAR(50) | Yes | — | ← NOT in entity! See F.2 |
| created_at | TIMESTAMP | No | NOW() | |
| updated_at | TIMESTAMP | No | NOW() | |

**Assessment:** The `rrfs` entity is the most complex in the codebase. **Critical Gap:** `business_unit` column exists in staging DB (added by `add-business-unit-column.sql`) but is **NOT declared in the `Rrf` entity**. A fresh rebuild from entities would not create this column. See Section F.

**Enum Risk:** TypeORM creates PostgreSQL native enum types for `@Column({ type: 'enum' })`. The `RrfStatus` enum has 11 values including backward-compat aliases (`SUBMITTED`, `REJECTED`, `OPEN_FOR_HIRING`). If the staging DB currently uses a VARCHAR column rather than a native PG enum type (which some versions of TypeORM generate), there will be a type mismatch. This needs verification.

---

### B.10 `rrf_approvers` — ✅ COMPLETE

```
Table:       rrf_approvers
PK:          id (SERIAL)
Enums:       ApprovalLevel (L1, L2, L3, final), ApprovalStatus (pending, approved, rejected, skipped)
Columns:     rrf_id INT FK→rrfs (CASCADE DELETE), user_id INT FK→users (no cascade),
             approval_level ENUM, approval_status ENUM default PENDING,
             approval_order INT default 1, comments TEXT nullable,
             approved_at TIMESTAMP nullable, rejected_at TIMESTAMP nullable,
             is_mandatory BOOL default true, assigned_at, updated_at
Indexes:     rrfId, userId, approvalLevel, approvalStatus
Unique:      @Unique(['rrfId', 'userId', 'approvalLevel'])
Relations:   ManyToOne → Rrf (onDelete: CASCADE), ManyToOne → User (eager)
Inverse:     Rrf.approvers (OneToMany) ✅ correctly mapped
```

**Assessment:** Complete. Cascade delete from `rrfs` is correctly declared.

---

### B.11 `rrf_form_configs` — ✅ COMPLETE

```
Table:       rrf_form_configs
PK:          id (SERIAL)
Columns:     field_name VARCHAR(50) UNIQUE, field_label VARCHAR(100),
             field_options JSONB, field_type VARCHAR(50) default 'dropdown',
             is_required BOOL default false, step INT default 1,
             section VARCHAR(100) default 'General', display_order INT default 0,
             is_active BOOL default true, created_at, updated_at
Relations:   None
```

**Assessment:** Complete. Matches all `add-form-config-columns.sql` additions exactly. `field_options` stored as JSONB — correctly typed.

---

### B.12 `notifications` — ✅ COMPLETE

```
Table:       notifications
PK:          id (SERIAL)
Columns:     user_id INT FK→users (CASCADE DELETE), title VARCHAR(255),
             message TEXT, type VARCHAR(50), priority VARCHAR(10) default 'MEDIUM',
             entity_type VARCHAR(30) nullable, entity_id INT nullable,
             action_url VARCHAR(500) nullable, channel VARCHAR(20) default 'IN_APP',
             status VARCHAR(20) default 'SENT', is_read BOOL default false,
             read_at TIMESTAMP nullable, metadata JSONB nullable default '{}'::jsonb,
             created_by INT nullable, dedupe_key VARCHAR(255) nullable,
             delivery_attempts INT default 0, created_at, updated_at
Indexes:     (user_id, is_read), (user_id, created_at), type, (entity_type, entity_id),
             status, UNIQUE partial on dedupe_key WHERE dedupe_key IS NOT NULL
Relations:   ManyToOne → User (onDelete: CASCADE)
```

**Cross-reference with migration file `1746028800000-CreateNotificationsTable.ts`:** The entity and the migration are **100% consistent** — same columns, same indexes, same partial unique index on `dedupe_key`. This is the one migration that was properly written.

**Assessment:** Complete. This is the best-structured entity-to-migration mapping in the codebase.

---

### B.13 `job_descriptions` — ⚠️ MINOR COLUMN NAME CASE ISSUE

```
Table:       job_descriptions
PK:          id (SERIAL)
Columns:     title VARCHAR(255), description TEXT, subFunction VARCHAR(255) nullable,
             created_by_id INT FK→users (CASCADE DELETE), created_at, updated_at
Indexes:     title, subFunction, created_by_id
Relations:   ManyToOne → User (eager: false)
```

**Assessment:** The entity uses `subFunction` (camelCase) as the column name with no explicit `name:` mapping. TypeORM will create column `"subFunction"` (quoted, case-sensitive) in PostgreSQL. However, `fix-job-descriptions-schema.sql` adds `subFunction VARCHAR(255)` using unquoted syntax, which PostgreSQL lowercases to `subfunction`. **There may be a case mismatch between entity-created column and SQL-created column.** This is a drift risk that requires verification on staging DB.

---

## C. Relationship Integrity Audit

### C.1 Complete Relationship Map

```
roles (1) ──────────────────────── (M) users
                                        │
modules (1) ──── (M) permissions        │
                        │               │
roles (1) ──── (M) role_permissions ────┘ via permission_id
                                        │
functions (1) ──── (M) subfunctions     │
                           │            │
                    (M) user_subfunctions (M) ── users
                                        │
users ────────────────────────────────── (M) rrfs (×8 FK columns)
                           │
subfunctions (1) ─────── (M) rrfs (subfunction_id)
                           │
rrfs (1) ──────────────── (M) rrf_approvers
                                users (M) ──┘
                           │
users (1) ──────────────── (M) notifications
users (1) ──────────────── (M) job_descriptions
```

### C.2 Relationship Issues Found

| # | Location | Issue | Severity |
|---|----------|-------|----------|
| 1 | `Module.parentModuleId` | Self-reference declared as plain `@Column` — no FK constraint will be generated by TypeORM. A fresh rebuild will allow invalid parent IDs without error. | LOW |
| 2 | `Rrf` → `User` (7 nullable FKs) | None of the nullable FKs (pmoVerifiedById, assignedToHrId, etc.) specify `onDelete`. TypeORM default is `RESTRICT`. If a user is deleted, any RRF referencing them will block the delete. | LOW |
| 3 | `Rrf.approvedBy` | `@ManyToOne(() => User, { nullable: true })` — the `nullable: true` in the relation options is not a standard TypeORM option here (it's used in `@Column`). The actual nullability is controlled by the `@Column({ name: 'approved_by_id', nullable: true })` above it. Harmless but imprecise. | INFO |
| 4 | `Rrf.subFunctionEntity` | `Rrf` has both `sub_function VARCHAR` (text) and `subfunction_id INT FK→subfunctions`. This mirrors the same dual-column transitional pattern as `Subfunction.function`. Both are in staging, rebuild must preserve both. | LOW |
| 5 | `RrfApprover` → `User` | `eager: true` on the user relation means every approver record auto-loads the user. In large datasets this could cause N+1 issues but is not a structural problem. | INFO |
| 6 | `UserSubfunction` inverse | `User.userSubfunctions` is declared as `@OneToMany → UserSubfunction`. However the `UserSubfunction` entity does NOT declare the inverse `@ManyToOne(() => User)` using the `(user) => user.userSubfunctions` inverse parameter — it uses the bare form. TypeORM will still generate correct FKs, but the inverse lazy-loading chain is incomplete. | LOW |
| 7 | `Notification.createdBy` | Declared as `@Column({ name: 'created_by', nullable: true })` plain integer — **no FK constraint declared** to `users`. TypeORM will not create an FK for this column. Orphan `createdBy` values cannot be caught by DB. | MEDIUM |

### C.3 Missing Inverse Relations

TypeORM does not require inverse declarations for functional FK creation, but these omissions prevent ORM-level bidirectional traversal:

- `Module` does not declare `@OneToMany → Permission`
- `Role` does not declare `@OneToMany → User` or `@OneToMany → RolePermission`
- `Permission` does not declare `@OneToMany → RolePermission`
- `User` does not declare `@OneToMany → Rrf` (for the 7 different FK relationships)
- `Subfunction` does not declare inverse for `user_subfunctions`

**These are not blockers for schema generation.** TypeORM generates correct FKs regardless. However, you cannot do `role.users` in code without these declarations.

### C.4 Cascade Summary

| Cascade | Effect |
|---------|--------|
| `user_subfunctions.user_id` ON DELETE CASCADE | Deleting a user removes their subfunction assignments |
| `user_subfunctions.subfunction_id` ON DELETE CASCADE | Deleting a subfunction removes all user assignments |
| `rrf_approvers.rrf_id` ON DELETE CASCADE | Deleting an RRF removes its approver records |
| `notifications.user_id` ON DELETE CASCADE | Deleting a user removes their notifications |
| `job_descriptions.created_by_id` ON DELETE CASCADE | Deleting a user removes their job description templates |
| All `rrfs` user FKs | RESTRICT by default — will block user deletion if RRFs reference them |

**Risk:** The RESTRICT default on `rrfs` user FKs means you cannot delete a user who has ever created, approved, declined, or closed an RRF. This is likely intentional business logic, but must be handled explicitly in any user deletion workflow.

---

## D. SQL Dependency Audit

### D.1 Schema Changes Only in SQL Files (Not in Entities)

These are schema changes applied to the staging DB via SQL that have **no corresponding entity representation** or are schema operations entities cannot perform:

| SQL File | Change | In Entity? | Risk if Rebuilt from Entity |
|----------|--------|-----------|----------------------------|
| `add-internal-rrf-no-column.sql` | `UNIQUE CONSTRAINT uq_internal_rrf_no` + `INDEX idx_internal_rrf_no` | Column in entity. Index declared via `@Column(unique: true)` on entity. **But** the named constraint `uq_internal_rrf_no` won't exist — TypeORM generates its own constraint name. | LOW — uniqueness preserved, just different constraint name |
| `add-functions-table.sql` | `INDEX idx_functions_is_active`, `INDEX idx_subfunctions_function_id` | Entity has `@Index(['isActive'])` which generates an index. The specific name `idx_subfunctions_function_id` won't match. | LOW — functionality preserved |
| `add-job-descriptions-table.sql` | `FOREIGN KEY fk_job_description_created_by ... ON DELETE CASCADE` | Entity has the FK with CASCADE. | ✅ Covered |
| `add-collaborative-edit-tracking.sql` | `INDEX idx_rrfs_last_edited_by_id` | Entity has `@Index` declared on rrfs level for rrfNumber, status, createdById, department, createdAt but NOT for last_edited_by_id. **This named index will not exist.** | LOW — missing performance index, not a correctness issue |
| `add-business-unit-column.sql` | `business_unit VARCHAR(50)` column on `rrfs` | **NOT IN ENTITY** | 🔴 HIGH — column will be missing after rebuild |
| `backup_before_workflow_20260401.sql` | Binary pg_dump backup | N/A — not a schema change | N/A |
| `backup_before_rrf_cleanup.sql` | Binary pg_dump backup | N/A | N/A |

### D.2 Data That Exists Only in SQL Files

These files contain INSERT/UPDATE statements that seed data and are **not covered by `seed.service.ts`**:

| SQL File | Data Seeded | In seed.service.ts? | Risk |
|----------|------------|---------------------|------|
| `seed.sql` | `rrf_form_configs` — 10 basic options | Partially — seed.service covers same fields but with different option values | MEDIUM — mismatched defaults if not re-run |
| `seed-admin.sql` | ADMIN role + all permissions assigned + admin user (`admin001`) | seed.service seeds admin but with userId `admin` not `admin001`, and email `admin@example.com` not `admin@rrfportal.com` | MEDIUM — different admin credentials than in SQL |
| `setup-roles-permissions.sql` | ROLES module + READ/UPDATE permissions | ✅ Covered by seed.service | LOW |
| `add-workflow-permissions.sql` | APPROVALS.ON_HOLD, RRF.OPEN_FOR_HIRING, RRF.FILL_FROM_BENCH, RRF.CLOSE permissions + role assignments | ✅ Covered by seed.service | LOW |
| `add-new-permissions.sql` | Duplicate of above (older camelCase version) | ✅ Covered | LOW |
| `add-missing-rrf-permissions.sql` | Duplicate of above (older camelCase version) | ✅ Covered | LOW |
| `add-business-unit-field.sql` | businessUnit config in rrf_form_configs | ✅ Partially — seed.service does NOT seed businessUnit form config | MEDIUM |
| `migrate-closed-by-bench.sql` | Data transformation: status → 'closed' + close_reason | Not a seed, a one-time migration | N/A — no longer relevant after rebuild |

### D.3 Logic That Exists Only in SQL Files (Not Reconstructable from Entities)

| Feature | SQL Mechanism | Entity Equivalent | Verdict |
|---------|--------------|------------------|---------|
| `internal_rrf_no` named constraint `uq_internal_rrf_no` | `ADD CONSTRAINT uq_internal_rrf_no UNIQUE` | TypeORM generates auto-named constraint | Functionally equivalent, different name |
| `typeorm_cache` table | Configured in `typeorm.config.ts` `cache:{}` | Auto-created by TypeORM | Covered |
| `status_history` DEFAULT fixed by `InitialSchema` migration | `ALTER COLUMN SET DEFAULT '[]'::jsonb` | Entity declares `default: () => "'[]'::jsonb"` | ✅ Entity covers this |
| Column comment on `internal_rrf_no` | `COMMENT ON COLUMN rrfs.internal_rrf_no IS '...'` | No equivalent in TypeORM decorators | LOW — just metadata |
| Self-referencing FK on `modules.parent_module_id` | Implicit (none declared) | Not declared as FK in entity | No FK in either case — consistent |

### D.4 Schema Logic That WILL Be Lost in Rebuild

| Item | How It Was Created | Will Survive Rebuild? |
|------|-------------------|----------------------|
| Named constraint `uq_internal_rrf_no` | Manual SQL | ❌ No — TypeORM generates unnamed/auto-named unique |
| Named index `idx_rrfs_last_edited_by_id` | Manual SQL | ❌ No — not declared in entity |
| Named index `idx_functions_is_active` | Manual SQL | ❌ No (TypeORM creates similar but unnamed) |
| Named FK `fk_subfunctions_function` | Manual SQL | ❌ No — TypeORM generates auto-named FK |
| `COMMENT ON COLUMN` annotations | Manual SQL | ❌ No — TypeORM does not support column comments |
| `business_unit` column in `rrfs` | Manual SQL | ❌ No — not in entity |
| `typeorm_cache` table | Runtime config | ✅ Yes — auto-created by TypeORM on use |

**Bottom line:** Only named constraints, specific index names, column comments, and the `business_unit` column are at risk. Everything else is either covered by the entity or can be reconstructed.

---

## E. Migration History Audit

### E.1 TypeORM Migration Files

| File | Timestamp | Operation | Status |
|------|-----------|-----------|--------|
| `1746028800000-CreateNotificationsTable.ts` | Apr 30, 2026 | Creates `notifications` table + 6 indexes | Correct, complete, safe to run |
| `1776781548847-InitialSchema.ts` | Future-dated | Single `ALTER COLUMN status_history SET DEFAULT` | Misleading name; operation is safe but trivial |
| `.gitkeep` | — | Placeholder | Not a migration |

### E.2 `data-source.ts` Analysis

```typescript
// ISSUES FOUND:
// 1. No SSL config — will fail on RDS/AWS PostgreSQL
// 2. entities glob: 'src/**/*.entity{.ts,.js}' — works when run via ts-node from rrf-portal-backend/
//    but after compilation, compiled files are in dist/ not src/ — entities path must match
// 3. migrations glob: 'src/migrations/*{.ts,.js}' — same issue post-compilation

// CORRECT approach for compiled runs:
// entities: ['dist/src/**/*.entity.js'],
// migrations: ['dist/src/migrations/*.js'],

// The package.json likely has typeorm scripts — check those for how the CLI is invoked
```

### E.3 Migration Reliability Rating

| Aspect | Rating | Notes |
|--------|--------|-------|
| Completeness | ❌ 10% | Only 2 of ~20 schema changes have TypeORM migrations |
| Trustworthiness | ⚠️ | The "InitialSchema" name is misleading and a trap for new developers |
| CLI configurability | ⚠️ | SSL missing, entity/migration paths may break post-compilation |
| `synchronize` discipline | ✅ | Correctly set to `false` everywhere |
| Idempotency of migration SQL | ✅ | Both existing migrations use safe SQL patterns |
| `typeorm_migrations` state | Unknown | Must be verified on staging DB |

---

## F. Schema Drift Analysis

### F.1 Fields in Entity But Likely Missing in Staging DB

| Entity | Column | Evidence of Absence |
|--------|--------|---------------------|
| `User` | `technologies` JSONB | No SQL file, no migration. Not in any seed script. Almost certain to be absent. |

### F.2 Fields in Staging DB But Missing in Entity

| Table | Column | SQL Evidence | Entity Declaration |
|-------|--------|-------------|-------------------|
| `rrfs` | `business_unit` VARCHAR(50) | `add-business-unit-column.sql` | **MISSING from `Rrf` entity** |

**This is the most critical drift item.** A rebuild from entities would not create `business_unit` on `rrfs`. After rebuild, any query or form submission that references `business_unit` would fail with "column does not exist."

### F.3 Column Name Case Inconsistency

| Table | Column | Entity Declares | SQL Declares | Actual in DB |
|-------|--------|----------------|-------------|--------------|
| `job_descriptions` | subfunction | `subFunction` (no `name:` mapping → TypeORM column = `"subFunction"`) | `subFunction` via `ALTER TABLE ADD COLUMN IF NOT EXISTS subFunction VARCHAR(255)` | Likely `subfunction` (lowercase) because unquoted SQL identifiers are lowercased by PostgreSQL |

**Risk:** The entity would generate a quoted column `"subFunction"` (case-sensitive). If the staging DB has `subfunction` (unquoted, lowercase), queries will fail after rebuild with "column subFunction does not exist."

### F.4 Tables Possibly in Staging DB But Not in Entities

| Table | Source | Entity Exists? |
|-------|--------|---------------|
| `typeorm_cache` | `typeorm.config.ts` cache config | No entity — auto-managed by TypeORM |
| `typeorm_migrations` | TypeORM CLI | No entity — auto-managed by TypeORM |

No other tables are expected without entities, but staging DB may have legacy or debug tables from prior manual operations.

### F.5 Enum Type Mismatch Risk

The `Rrf` entity uses `@Column({ type: 'enum', enum: RrfStatus })` which TypeORM compiles to a PostgreSQL native `CREATE TYPE` enum. However, if the staging DB `status` column was originally created as `VARCHAR` (which early migrations and many SQL files imply — they just `INSERT` string values without referencing an enum type), there will be a type mismatch.

**Specific risk:** TypeORM generated migration would try to create `CREATE TYPE rrf_status_enum AS ENUM (...)` and then `ALTER TABLE rrfs ALTER COLUMN status TYPE rrf_status_enum USING status::rrf_status_enum`. This conversion can fail if any existing values in the column don't match the enum definition exactly.

The `RrfStatus` enum includes backward-compat aliases: `SUBMITTED = 'submitted'`, `REJECTED = 'rejected'`, `OPEN_FOR_HIRING = 'open-for-hiring'`. If any rows in staging have these values, the USING cast will succeed. But `CLOSED_BY_BENCH = 'closed-by-bench'` was removed from the current enum — if any rows still have this value (and `migrate-closed-by-bench.sql` wasn't applied), the enum conversion would fail.

**Same risk applies to** `ApprovalLevel` and `ApprovalStatus` enums in `rrf_approvers`.

### F.6 Drift Summary Table

| Drift Type | Item | Severity | Rebuild Impact |
|-----------|------|----------|----------------|
| Column in DB, missing in entity | `rrfs.business_unit` | 🔴 HIGH | Column won't be created; app breaks on business_unit operations |
| Column in entity, missing in DB | `users.technologies` | 🔴 HIGH | App breaks when technologies field accessed |
| Column name case mismatch | `job_descriptions.subFunction` vs `subfunction` | 🟡 MEDIUM | Queries against this column may fail |
| Enum type vs VARCHAR | `rrfs.status`, `rrf_approvers.approval_level/status` | 🟡 MEDIUM | Type conversion may fail or require manual intervention |
| Named constraints lost | `uq_internal_rrf_no` etc. | 🟢 LOW | Functionally equivalent, just different names |
| Missing index | `idx_rrfs_last_edited_by_id` | 🟢 LOW | Performance only |
| FK constraint names | All FK names differ | 🟢 LOW | Names differ; enforcement is identical |

---

## G. Schema Rebuild Readiness

### G.1 The Rebuild Workflow Being Evaluated

```
backup staging DB
→ create fresh DB
→ generate migrations (typeorm migration:generate)
→ run migrations (typeorm migration:run)
→ run seeds (POST /api/seed)
→ start backend
→ test application
```

### G.2 Step-by-Step Failure Analysis

**Step 1: Backup staging DB**
✅ Safe. Standard `pg_dump`. Backup exists as safety net.

**Step 2: Create fresh DB**
✅ Safe. Standard PostgreSQL operation.

**Step 3: Generate migrations from entities**
⚠️ **HIGH RISK STEP.** `typeorm migration:generate` compares entity metadata to a LIVE database. On an **empty** fresh DB, TypeORM would generate a migration that creates all tables. This is actually the correct behavior for a fresh DB.

BUT — the generated migration will:
- Create `rrfs.status` as a PostgreSQL native enum type with 11 values
- NOT include `rrfs.business_unit` (missing from entity)
- Create `job_descriptions.subFunction` with a quoted camelCase column name
- NOT fix the `users.technologies` timing issue (already in entity)

**Step 4: Run migrations**
⚠️ The auto-generated migration will run successfully on a fresh DB. All tables will be created. However:
- `rrfs.business_unit` column will be absent
- `job_descriptions.subFunction` will be created as `"subFunction"` (quoted)
- Any application code referencing `business_unit` will fail with column-not-found errors

**Step 5: Run seeds**
⚠️ seed.service.ts will populate roles, modules, permissions, role-permissions, admin user, form configs. But:
- `businessUnit` form config (from `add-business-unit-field.sql`) is NOT in seed.service
- Admin credentials will be `userId: 'admin'` / `admin@example.com` (seed.service defaults) — different from `admin001` / `admin@rrfportal.com` (from `seed-admin.sql`)
- FORM_CONFIG module seeding does not include `businessUnit` field config

**Step 6: Start backend**
⚠️ Will start, but:
- Any request that uses `business_unit` will get a DB error
- If old staging data is not restored, all form data and RRF history is empty

**Step 7: Test application**
🔴 Business unit related functionality breaks immediately

### G.3 Rebuild Verdict

| Aspect | Status |
|--------|--------|
| Core tables creatable from entities | ✅ YES |
| All columns preserved | ❌ NO — `business_unit` missing |
| All relationships preserved | ✅ YES (FKs will be correct, just differently named) |
| Constraints preserved | ⚠️ PARTIALLY — unique/not null preserved, named constraints lost |
| Permissions/roles restorable | ✅ YES via seeds |
| Admin user restorable | ⚠️ PARTIAL — different credentials than SQL version |
| Form configs restorable | ⚠️ PARTIAL — businessUnit config not in seed |
| RRF data restored | ❌ NO — staging data not automatically restored |
| Application fully functional | ❌ NO — `business_unit` gap breaks functionality |

**Overall Verdict:**

> **PARTIALLY SAFE — with 2 mandatory pre-actions before rebuild.**

The rebuild is feasible and the entities cover ~95% of the schema. The remaining 5% consists of one column gap (`business_unit`) and one seeding gap (`businessUnit` form config). Both are fixable in under 30 minutes by patching the entity and the seed service before generating migrations.

---

## H. Seeding Readiness

### H.1 What seed.service.ts Can Restore

| Data Category | Covered? | Notes |
|--------------|----------|-------|
| Roles (5 roles) | ✅ Yes | ADMIN, PMO, APPROVER, HR, HIRING_MANAGER |
| Functions (3) | ✅ Yes | Delivery, Sales, Support |
| Subfunctions (11) | ✅ Yes | All with function linkage |
| Modules (8) | ✅ Yes | All RBAC modules including FORM_CONFIG |
| Permissions (27 total) | ✅ Yes | All permissions including ON_HOLD, OPEN_FOR_HIRING, FILL_FROM_BENCH, CLOSE |
| Role-Permission mappings | ✅ Yes | All 5 roles with correct permission sets |
| Admin user | ⚠️ Partial | Creates userId='admin', email='admin@example.com' — different from SQL-seeded admin001 |
| Form configs (13 fields) | ⚠️ Partial | Seeds 13 fields across 3 steps but MISSING businessUnit |
| RRF data | ❌ No | Staging RRF records cannot be seeded — must be restored from backup |
| User accounts (non-admin) | ❌ No | Real user accounts must be manually recreated or restored |
| Job description templates | ❌ No | Not in seed service |

### H.2 What Requires Manual Restoration or Extra Steps

| Item | How to Restore |
|------|---------------|
| `businessUnit` form config | Add to seed.service OR run `add-business-unit-field.sql` after seed |
| Non-admin users | Restore from pg_dump backup OR re-register users manually |
| RRF records | Restore from pg_dump backup (no seed path exists) |
| Job description templates | Restore from pg_dump backup OR re-run `add-job-descriptions-table.sql` data portion |
| Admin credentials alignment | Choose one: update seed to match `admin001`/`admin@rrfportal.com` OR document the change |

### H.3 Permission Coverage Comparison: seed.service vs SQL files

The seed service now correctly covers all permissions that were previously added via ad-hoc SQL files. The older SQL files (`add-new-permissions.sql`, `add-missing-rrf-permissions.sql`, `add-workflow-permissions.sql`) used camelCase column names and are now superseded by the seed service. **After a fresh rebuild, only the seed service needs to run — the SQL files are obsolete for fresh setups.**

### H.4 Seeding Order Dependency

The seed.service.ts respects entity dependencies in its execution order:
```
seedRoles() → seedFunctions() → seedSubfunctions() → seedModules()
→ seedPermissions() → seedRolePermissions() → seedAdminUser() → seedFormConfigs()
```
This order is correct. `seedSubfunctions` depends on functions existing. `seedRolePermissions` depends on both roles and permissions. No ordering problems detected.

---

## I. Safe Migration Adoption Strategy

### I.1 Pre-Rebuild Mandatory Fixes (2 items, no other code changes)

Before generating any migrations, these two gaps MUST be closed:

**Fix 1: Add `business_unit` to `Rrf` entity**

Add this column to `rrf.entity.ts` in the appropriate location (with other organization fields like `organisation`, `entity`):

```typescript
@Column({ name: 'business_unit', length: 50, nullable: true })
businessUnit: string;
```

**Fix 2: Add `businessUnit` form config to seed.service.ts**

Add to the `formConfigs` array in `seedFormConfigs()`:

```typescript
{
  fieldName: 'businessUnit',
  label: 'Business Unit',
  options: ['SG', 'VR', 'PMO'],
  step: 1,
  section: 'Organization',
  displayOrder: 6,
  isActive: true,
},
```

### I.2 The Safe Rebuild Sequence

```
1. BACKUP
   pg_dump -h <host> -U <user> -d <dbname> -F c -f staging_backup_$(date +%Y%m%d).dump

2. APPLY PRE-REBUILD FIXES
   a. Add business_unit column to Rrf entity (Fix 1 above)
   b. Add businessUnit to seed service (Fix 2 above)
   c. Verify job_descriptions subFunction column name mapping (add explicit name: 'subFunction' or 'sub_function')

3. CREATE FRESH DB
   createdb rrf_portal_fresh

4. GENERATE INITIAL MIGRATION
   cd rrf-portal-backend
   npm run build
   npx typeorm migration:generate src/migrations/InitialFreshSchema -d dist/data-source.js
   # IMPORTANT: Review the generated output BEFORE running it
   # Look for: DROP TABLE, DROP COLUMN, DROP TYPE — should be none on fresh DB

5. RUN MIGRATION
   npx typeorm migration:run -d dist/data-source.js

6. VERIFY SCHEMA
   # Connect to DB and run:
   \d rrfs                   -- verify business_unit column present
   \d users                  -- verify technologies column present
   \d job_descriptions       -- verify subfunction column case

7. RUN SEEDS
   POST /api/seed/all        -- or however the seed endpoint is called

8. VERIFY SEEDS
   SELECT COUNT(*) FROM roles;             -- expect 5
   SELECT COUNT(*) FROM modules;           -- expect 8
   SELECT COUNT(*) FROM permissions;       -- expect ~27
   SELECT COUNT(*) FROM role_permissions;  -- expect ~40+
   SELECT * FROM rrf_form_configs;         -- expect 14 fields including businessUnit

9. RESTORE SELECTIVE DATA (if needed)
   pg_restore --data-only --table=users -d rrf_portal_fresh staging_backup.dump
   pg_restore --data-only --table=rrfs -d rrf_portal_fresh staging_backup.dump
   (etc. for other tables with real data)

10. START AND SMOKE TEST
    pm2 start ecosystem.config.js
    # Test: login, create RRF, view RRF, check permissions
```

### I.3 Going Forward: The Migration Contract

After the fresh rebuild, all future schema changes must follow:

```
1. Change the TypeScript entity
2. Generate a migration: npx typeorm migration:generate src/migrations/DescriptiveName -d dist/data-source.js
3. Review the generated migration — reject any DROP statements unless intentional
4. Commit entity change + migration file together
5. CI/CD runs migration:run before PM2 restart
```

**Never again:**
- Add columns via raw SQL without updating the entity
- Update the entity without a migration file
- Use `synchronize: true`
- Create SQL files in `Data/` for new schema changes (archive-only from this point)

---

## J. Testing & Validation Strategy

### J.1 Schema Equivalence Verification

After rebuild, compare the fresh DB schema against the staging backup:

```sql
-- Run on BOTH staging DB and fresh DB, compare output:
SELECT 
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Export to file and diff:
-- psql staging_db -c "SELECT ..." > staging_schema.txt
-- psql fresh_db -c "SELECT ..." > fresh_schema.txt
-- diff staging_schema.txt fresh_schema.txt
```

### J.2 Index and Constraint Verification

```sql
-- Compare indexes:
SELECT 
  tablename, 
  indexname, 
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Compare foreign keys:
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

### J.3 Seeding Validation Queries

```sql
-- Roles check
SELECT role_code, role_name, is_active FROM roles ORDER BY priority;
-- Expected: ADMIN, PMO, APPROVER, HR, HIRING_MANAGER (5 rows)

-- Modules check
SELECT module_code, module_name, display_order FROM modules ORDER BY display_order;
-- Expected: 8 modules

-- Permissions count per module
SELECT m.module_code, COUNT(p.id) AS permission_count
FROM modules m LEFT JOIN permissions p ON m.id = p.module_id
GROUP BY m.module_code ORDER BY m.module_code;
-- Expected: DASHBOARD:1, RRF:7, APPROVALS:4, ROLES:2, USERS:4, REPORTS:2, SETTINGS:2, FORM_CONFIG:4

-- Role permission totals
SELECT r.role_code, COUNT(rp.id) AS permission_count
FROM roles r LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.role_code ORDER BY r.role_code;
-- Compare to seed service roleMappings array lengths

-- Form configs
SELECT field_name, step, section FROM rrf_form_configs ORDER BY step, display_order;
-- Verify businessUnit (step 1) is present
```

### J.4 Application-Level Smoke Tests

| Test | What It Validates |
|------|------------------|
| Login as admin | Users table, password hash, JWT generation |
| Create an RRF | All `rrfs` column types, FKs, enum values |
| Set business_unit on RRF form | `business_unit` column exists and is writable |
| Submit RRF for approval | Status enum transition (DRAFT→PENDING) |
| View approvals list | `rrf_approvers` FK joins, permissions check |
| Approve an RRF | Status enum transition (PENDING→APPROVED), approved_by_name write |
| Put on hold | APPROVALS.ON_HOLD permission gate |
| PMO: Open for hiring | RRF.OPEN_FOR_HIRING permission gate |
| PMO: Fill from bench | `internal_rrf_no` unique constraint, `close_reason` |
| HR: Close RRF | RRF.CLOSE permission, `candidate_name`, `joining_date` |
| Admin: Manage users | `technologies` JSONB read/write |
| Create job description | `job_descriptions.subFunction` column case |

### J.5 Data Restoration Validation

If staging data is restored via `pg_restore --data-only`:

```sql
-- Check for orphaned FKs after restore (should return 0 rows):
SELECT r.id FROM rrfs r
LEFT JOIN users u ON u.id = r.created_by_id
WHERE u.id IS NULL;

-- Check enum value integrity:
SELECT DISTINCT status FROM rrfs WHERE status NOT IN (
  'draft','pending','submitted','approved','declined','rejected',
  'on-hold','in-progress','open-for-hiring','closed-by-bench','closed'
);
-- Should return 0 rows
```

---

## K. Final Recommendation

### K.1 Is a Clean Rebuild Feasible?

**Yes. With 2 targeted fixes, a clean rebuild is fully feasible.**

The entities are ~95% complete. The entity layer is well-structured, snake_case column naming is consistent (with one case issue in job_descriptions), relationships are correctly declared, enums are properly typed, and the seed service covers all business-critical reference data.

The rebuild gap is precisely defined and small:
1. `business_unit` column missing from `Rrf` entity → 1 line fix
2. `businessUnit` form config missing from seed → 5 line fix
3. `job_descriptions.subFunction` case → 1 line fix

### K.2 Are Entities Sufficiently Complete?

| Entity | Completeness | Notes |
|--------|-------------|-------|
| `Role` | ✅ 100% | |
| `Module` | ✅ 98% | Self-ref FK not enforced — acceptable |
| `Permission` | ✅ 100% | |
| `RolePermission` | ✅ 100% | |
| `User` | ⚠️ 98% | `technologies` may be missing in staging |
| `Function` | ✅ 100% | |
| `Subfunction` | ✅ 100% | Transitional dual-column is correct |
| `UserSubfunction` | ✅ 100% | |
| `Rrf` | ⚠️ 95% | `business_unit` missing from entity |
| `RrfApprover` | ✅ 100% | |
| `RrfFormConfig` | ✅ 100% | |
| `Notification` | ✅ 100% | Best-aligned entity-to-migration in codebase |
| `JobDescription` | ⚠️ 97% | subFunction column name case issue |

**Overall entity completeness: ~99% after the 3 minor fixes.**

### K.3 Are Hidden SQL Dependencies Too High?

**No. The SQL dependency risk is manageable and bounded.**

The `Data/` SQL files represent historical schema evolution but almost all of it is now represented in entities. The only irrecoverable items are:
- Named constraint and index names (functionally irrelevant — TypeORM auto-generates equivalents)
- Column comments (documentation only)
- The `business_unit` column gap (fixable in 1 line)

The risk level that was present 6 months ago (when the project had no entities and everything was ad-hoc SQL) has been largely resolved by the entity-first refactor that already happened.

### K.4 Safest Next Steps

| Priority | Action | Effort |
|----------|--------|--------|
| 1 | Run diagnostics on staging DB (check `typeorm_migrations`, verify column presence) | 10 min |
| 2 | Add `business_unit` to `Rrf` entity | 1 min |
| 3 | Fix `subFunction` column name mapping in `JobDescription` entity | 1 min |
| 4 | Add `businessUnit` to `seed.service.ts` form configs | 2 min |
| 5 | Fix `data-source.ts` SSL config | 5 min |
| 6 | Take full `pg_dump` backup of staging DB | 5 min |
| 7 | Create fresh DB and run migration:generate + migration:run | 20 min |
| 8 | Run seeds, smoke test | 15 min |
| 9 | Selective pg_restore of user/rrf data from backup (if needed) | 30 min |
| 10 | Update CI/CD to run migration:run on every deploy | 15 min |

**Total estimated time for a clean, stable rebuild: ~2 hours.**

### K.5 Safest Migration Architecture Going Forward

```
RULE 1: Entity is the source of truth.
        Every schema change starts with the TypeScript entity.

RULE 2: Every entity change has a migration file.
        npx typeorm migration:generate → review → commit with entity.

RULE 3: CI/CD runs migrations automatically.
        migration:run executes BEFORE pm2 restart on every deploy.

RULE 4: Data/ SQL files are archived, not executed.
        No new SQL files for schema changes. Ever.

RULE 5: Seeds are idempotent and complete.
        seed.service.ts must be kept in sync with all reference data needs.

RULE 6: Backups before every migration in production-equivalent environments.
        RDS snapshot or pg_dump before any migration:run.
```

### K.6 Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Enum type vs VARCHAR mismatch on staged data restore | MEDIUM | HIGH | Verify enum column types in staging before restore; use explicit `USING` cast in migration if needed |
| `subFunction` case mismatch in job_descriptions | MEDIUM | MEDIUM | Add explicit `name: 'sub_function'` to entity before migration generate |
| `business_unit` absent after rebuild (if fix not applied) | HIGH | HIGH | Apply Fix 1 before generating migration |
| `typeorm_cache` table missing (if runtime cache is enabled) | LOW | LOW | Auto-created on first cache operation |
| Admin user credential mismatch | MEDIUM | LOW | Document or align with team which credentials are canonical |
| migration:generate on non-empty DB producing DROP statements | LOW | HIGH | Always generate against fresh empty DB; never against staging |

---

*Document generated: May 11, 2026*  
*Verified against: 13 entity files, 22 SQL files, `seed.service.ts` (full read), `data-source.ts`, `typeorm.config.ts`, `app.module.ts`, 2 TypeORM migration files*
