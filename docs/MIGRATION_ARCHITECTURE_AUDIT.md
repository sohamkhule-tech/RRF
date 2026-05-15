# Migration Architecture Audit
**Project:** RRF Portal Backend  
**Date:** May 2026  
**Scope:** Full analysis of TypeORM migration infrastructure, schema drift, and safe adoption strategy  
**Constraint:** Production DB has real data. No destructive operations.

---

## Table of Contents

- [A. Current Migration State Audit](#a-current-migration-state-audit)
- [B. Existing Schema Drift Analysis](#b-existing-schema-drift-analysis)
- [C. SQL Migration File Analysis](#c-sql-migration-file-analysis)
- [D. Safe Migration Adoption Strategy](#d-safe-migration-adoption-strategy)
- [E. Baseline vs Incremental Migration Recommendation](#e-baseline-vs-incremental-migration-recommendation)
- [F. Exact Future Migration Workflow](#f-exact-future-migration-workflow)
- [G. Migration Execution Strategy](#g-migration-execution-strategy)
- [H. Table/Data Safety Strategy](#h-tabledata-safety-strategy)
- [I. Seeding Strategy](#i-seeding-strategy)
- [J. Final Recommended Architecture](#j-final-recommended-architecture)

---

## A. Current Migration State Audit

### A.1 TypeORM Migration Files Found

| File | Timestamp | Approx. Date | Actual Operation |
|------|-----------|--------------|-----------------|
| `1746028800000-CreateNotificationsTable.ts` | 1746028800000 | ~April 30, 2026 | Creates `notifications` table + 6 indexes |
| `1776781548847-InitialSchema.ts` | 1776781548847 | ~April 2026 | Changes `status_history` DEFAULT only |

**Critical Finding — Misleading Name:**  
`InitialSchema1776781548847` is **not** an initial schema. Its entire `up()` body is:
```sql
ALTER TABLE "rrfs" ALTER COLUMN "status_history" SET DEFAULT '[]'::jsonb
```
This is a single targeted column default change. The name suggests it creates all tables from scratch — it does not. Running it on an empty database would crash because the `rrfs` table does not exist.

**Critical Finding — Future Timestamp:**  
Timestamp `1776781548847` is approximately April 2026. TypeORM orders migrations by timestamp. This migration will always run **after** `CreateNotificationsTable` regardless of alphabetical order.

### A.2 Migration CLI Configuration (`data-source.ts`)

```typescript
// Current state
entities: ['src/**/*.entity{.ts,.js}'],   // glob relative to cwd
migrations: ['src/migrations/*{.ts,.js}'], // ALL files in src/migrations
migrationsTableName: 'typeorm_migrations',
synchronize: false,  // CORRECT
logging: ['query', 'error', 'warn', 'migration'],
// NO ssl config — will fail on RDS/production PostgreSQL
```

**Issue:** `data-source.ts` has no SSL configuration while `typeorm.config.ts` sets `ssl: true`. The migration CLI will fail to connect to production AWS RDS because AWS RDS requires SSL. **This must be fixed before running any migration in production.**

**Issue:** `.env` path in `data-source.ts` is `path.resolve(__dirname, '../.env')` which works when compiled to `dist/data-source.js` (looks in project root) but will NOT work when run via `ts-node` directly (looks one level above `src/` which may not be correct depending on cwd).

### A.3 Migration Tracking Table

TypeORM writes to `typeorm_migrations` to track which migrations have been applied. There are two scenarios for production:

| Scenario | `typeorm_migrations` exists? | Recorded entries |
|----------|------------------------------|-----------------|
| **A** — Migrations never used | No | None |
| **B** — Migrations run once | Yes | 0, 1, or 2 entries |

**You must determine which scenario applies** by running on production:
```sql
SELECT * FROM typeorm_migrations ORDER BY timestamp;
```
If the table does not exist, you are in Scenario A and need the full baseline strategy in [Section D](#d-safe-migration-adoption-strategy).

### A.4 `synchronize: false` Verification

| Location | `synchronize` | Status |
|----------|--------------|--------|
| `app.module.ts` → `TypeOrmModule.forRootAsync` | `false` | ✅ Correct |
| `typeorm.config.ts` static object | `false` | ✅ Correct |
| `data-source.ts` | `false` | ✅ Correct |

`synchronize` is correctly set to `false` everywhere. TypeORM will never auto-apply schema changes.

---

## B. Existing Schema Drift Analysis

### B.1 What the Entities Declare vs What SQL History Shows

The following tables document every column in the codebase entities and their deployment status.

#### Table: `users`

| Column | Entity Declaration | SQL History | Status |
|--------|-------------------|-------------|--------|
| `id` | PK SERIAL | In core seed | ✅ In production |
| `user_id` | VARCHAR(50) UNIQUE | In core seed | ✅ In production |
| `email` | VARCHAR(100) UNIQUE | In core seed | ✅ In production |
| `password_hash` | VARCHAR(255) | In core seed | ✅ In production |
| `full_name` | VARCHAR(100) | In core seed | ✅ In production |
| `department` | VARCHAR(100) nullable | In core seed | ✅ In production |
| `phone` | VARCHAR(20) nullable | In core seed | ✅ In production |
| `is_active` | BOOLEAN default true | In core seed | ✅ In production |
| `last_login` | TIMESTAMP nullable | In core seed | ✅ In production |
| `role_id` | FK → roles | In core seed | ✅ In production |
| `technologies` | JSONB nullable `'[]'::jsonb` | **No SQL file exists** | ⚠️ **PROBABLY MISSING in production** |
| `created_at` | TIMESTAMP | In core seed | ✅ In production |
| `updated_at` | TIMESTAMP | In core seed | ✅ In production |

**`technologies` column** was added directly to the entity without a corresponding SQL migration file. There is no `add-technologies-column.sql` in `Data/`. This column **must be added to production via a new TypeORM migration** before deploying.

#### Table: `rrfs`

| Column | SQL Evidence | Status |
|--------|-------------|--------|
| Core columns (position_title, department, status, etc.) | Core schema | ✅ In production |
| `status_history` JSONB `'[]'::jsonb` | `add-status-history-column.sql` (Apr 17) | ✅ Applied |
| `internal_rrf_no` VARCHAR(50) UNIQUE | `add-internal-rrf-no-column.sql` (Apr 16) | ✅ Applied |
| `business_unit` VARCHAR(50) | `add-business-unit-column.sql` | ✅ Applied |
| `close_reason` VARCHAR(50) | `add-close-reason-column.sql` | ✅ Applied |
| `closure_status` VARCHAR(255) | Referenced in `migrate-closed-by-bench.sql` | ✅ Applied |
| `approved_by_name` VARCHAR(255) | `add-approved-by-name-column.sql` (Apr 28) | ✅ Applied |
| `declined_by_name` VARCHAR(255) | `add-audit-name-columns.sql` (Apr 28) | ✅ Applied |
| `on_hold_by_id` INTEGER | `add-audit-name-columns.sql` (Apr 28) | ✅ Applied |
| `on_hold_by_name` VARCHAR(255) | `add-audit-name-columns.sql` (Apr 28) | ✅ Applied |
| `last_edited_by_id` INTEGER FK | `add-collaborative-edit-tracking.sql` (Apr 22) | ✅ Applied |
| `last_edited_by_role` VARCHAR(50) | `add-collaborative-edit-tracking.sql` (Apr 22) | ✅ Applied |
| `last_edited_at` TIMESTAMP | `add-collaborative-edit-tracking.sql` (Apr 22) | ✅ Applied |

#### Table: `notifications`

| Status | Evidence |
|--------|---------|
| TypeORM migration `CreateNotificationsTable` declares this table | Migration file exists |
| No corresponding SQL in `Data/` | Not manually applied |
| **Unknown if migration was ever run against production** | Must be verified |

If `typeorm_migrations` does NOT contain a record for `CreateNotificationsTable1746028800000`, then the `notifications` table does **not** exist in production and the backend will crash when notification code is invoked.

#### Table: `functions`

| Status | Evidence |
|--------|---------|
| `add-functions-table.sql` (Apr 20, 2026) | SQL manually applied |
| TypeORM entity `Function` exists | Matches SQL |
| ✅ Probably in production | — |

#### Table: `job_descriptions`

| Status | Evidence |
|--------|---------|
| `add-job-descriptions-table.sql` (Apr 21, 2026) | SQL manually applied |
| TypeORM entity `JobDescription` exists | Matches SQL |
| ✅ Probably in production | — |

### B.2 Summary of Drift

| Risk Level | Item |
|-----------|------|
| 🔴 **HIGH** | `users.technologies` JSONB column — entity declares it, no SQL history, likely missing in production. Will cause crashes when user data with this field is queried or saved. |
| 🟡 **MEDIUM** | `notifications` table — TypeORM migration may not have been run. Missing table = runtime crash. |
| 🟡 **MEDIUM** | `data-source.ts` missing SSL config — migration CLI cannot connect to production RDS. |
| 🟢 **LOW** | `InitialSchema` migration name is misleading but its operation is safe. |
| 🟢 **LOW** | Multiple SQL files in `Data/` have no TypeORM tracking — historical but low risk since they are already applied. |

---

## C. SQL Migration File Analysis

### C.1 Classification by Type

| File | Type | Tables Affected | Idempotent? |
|------|------|----------------|-------------|
| `seed.sql` | Data seed | `rrf_form_configs` | Yes — uses `ON CONFLICT DO UPDATE` |
| `seed-admin.sql` | Data seed | `users`, `roles` | Unknown |
| `setup-roles-permissions.sql` | Data seed | `modules`, `permissions`, `role_permissions` | Yes — uses `WHERE NOT EXISTS` |
| `add-status-history-column.sql` | Schema | `rrfs` | Yes — `ADD COLUMN IF NOT EXISTS` |
| `add-internal-rrf-no-column.sql` | Schema | `rrfs` | Partially — column add is idempotent, but UNIQUE CONSTRAINT add is NOT |
| `add-business-unit-column.sql` | Schema | `rrfs` | Yes — `ADD COLUMN IF NOT EXISTS` |
| `add-close-reason-column.sql` | Schema | `rrfs` | Yes — `ADD COLUMN IF NOT EXISTS` |
| `add-close-reason-column.sql` | Schema | `rrfs` | Yes |
| `add-approved-by-name-column.sql` | Schema + backfill | `rrfs` | Yes — `ADD COLUMN IF NOT EXISTS` + safe UPDATE |
| `add-audit-name-columns.sql` | Schema + backfill | `rrfs` | Yes — `ADD COLUMN IF NOT EXISTS` + safe UPDATE |
| `add-collaborative-edit-tracking.sql` | Schema | `rrfs` | Yes — `ADD COLUMN IF NOT EXISTS` |
| `add-functions-table.sql` | Schema + data | `functions`, `subfunctions` | Yes — `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS` |
| `add-job-descriptions-table.sql` | Schema + data | `job_descriptions` | Yes — `CREATE TABLE IF NOT EXISTS` |
| `add-form-config-columns.sql` | Schema | `rrf_form_configs` | Yes — `ADD COLUMN IF NOT EXISTS` |
| `add-business-unit-field.sql` | Data | `rrf_form_configs` | Yes — `ON CONFLICT DO UPDATE` |
| `add-workflow-permissions.sql` | Data | `permissions`, `role_permissions` | Yes — `ON CONFLICT DO NOTHING` |
| `add-new-permissions.sql` | Data | `permissions`, `role_permissions` | Yes — `ON CONFLICT DO NOTHING` |
| `add-missing-rrf-permissions.sql` | Data | `permissions`, `role_permissions` | Yes — `ON CONFLICT DO NOTHING` |
| `migrate-closed-by-bench.sql` | Data migration | `rrfs` | Yes — uses `WHERE status = 'closed-by-bench'` |
| `fix-job-descriptions-schema.sql` | Schema fix | `job_descriptions` | Unknown — need to read |
| `verify-admin-permissions.sql` | Verification only | None (SELECT) | — |
| `verify-on-hold-permission.sql` | Verification only | None (SELECT) | — |
| `debug-permissions-api.sql` | Debug only | None (SELECT) | — |
| `backup_before_workflow_20260401.sql` | Backup | — | — |

### C.2 Column Name Inconsistency Alert

The older SQL files (e.g., `add-new-permissions.sql`) use `"roleName"`, `"isActive"`, `"moduleCode"` (camelCase with quotes) — indicating they were written for the pre-refactor schema where TypeORM used the TypeScript property name as column name by default.

The newer SQL files (e.g., `add-workflow-permissions.sql`) use `module_code`, `role_name`, `permission_code` (snake_case without quotes) — indicating the schema was later normalized to use explicit snake_case column names.

**This means the database currently has a mix of column naming conventions.** Some permissions-related columns may use camelCase, others snake_case. This is a known risk and must be verified if adding new permissions manually.

### C.3 Files With No TypeORM Migration Equivalent

Every SQL file in `Data/` is a **manual change with no TypeORM tracking**. TypeORM's `typeorm_migrations` table has NO record of any of these changes. If someone runs `typeorm migration:run` on a fresh database, none of these changes will be applied.

---

## D. Safe Migration Adoption Strategy

> **This strategy assumes production has real data and the schema was built through manual SQL execution. DO NOT run `migration:run` blindly on production.**

### D.1 Phase 1 — Assess Production State (Read-Only)

Run these diagnostic queries on the production database **before touching anything**:

```sql
-- Step 1: Check if typeorm_migrations table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'typeorm_migrations'
) AS migrations_table_exists;

-- Step 2: If it exists, see what's recorded
SELECT * FROM typeorm_migrations ORDER BY timestamp;

-- Step 3: Check if notifications table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'notifications'
) AS notifications_exists;

-- Step 4: Check if technologies column exists on users
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'technologies';

-- Step 5: Check status_history column default
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'rrfs' AND column_name = 'status_history';

-- Step 6: Check if functions table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'functions'
) AS functions_exists;
```

### D.2 Phase 2 — Handle the `typeorm_migrations` Table

#### Scenario A: `typeorm_migrations` does NOT exist

Create it manually and insert fake records for migrations that are ALREADY applied in production. **TypeORM's actual table structure:**

```sql
-- Create the migrations tracking table (same structure TypeORM auto-creates)
CREATE TABLE IF NOT EXISTS typeorm_migrations (
  id         SERIAL PRIMARY KEY,
  "timestamp" BIGINT NOT NULL,
  name       VARCHAR NOT NULL
);
```

Then, for each TypeORM migration file that IS already applied to production, insert a baseline record:

```sql
-- Mark CreateNotificationsTable as applied IF the notifications table already exists
-- (Only insert this if you verified the table exists in Step 3 above)
INSERT INTO typeorm_migrations ("timestamp", name)
VALUES (1746028800000, 'CreateNotificationsTable1746028800000');

-- Mark InitialSchema as applied IF status_history already has '[]'::jsonb default
-- (Only insert this if you verified the default in Step 5 above)
INSERT INTO typeorm_migrations ("timestamp", name)
VALUES (1776781548847, 'InitialSchema1776781548847');
```

#### Scenario B: `typeorm_migrations` exists with entries

Verify the entries match the migration file names exactly. TypeORM compares the `name` column to the migration class `name` property.

```sql
-- Check current entries
SELECT * FROM typeorm_migrations ORDER BY timestamp;

-- TypeORM will only run migrations NOT already recorded here.
-- If CreateNotificationsTable1746028800000 is listed → it won't run again (safe).
-- If InitialSchema1776781548847 is listed → it won't run again (safe).
```

### D.3 Phase 3 — Fix `data-source.ts` Before Running Any Migration

Before using the migration CLI in production, add SSL configuration:

```typescript
// data-source.ts — add ssl section
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  logging: ['query', 'error', 'warn', 'migration'],
});
```

The migration CLI should be invoked as:
```bash
DB_SSL=true DB_HOST=... npx typeorm migration:run -d dist/data-source.js
```

### D.4 Phase 4 — The Missing `technologies` Column

The `users.technologies` column exists in the TypeScript entity but has NO corresponding SQL file and NO TypeORM migration. You must create a new migration:

```bash
# From inside rrf-portal-backend/
npx typeorm migration:create src/migrations/AddUserTechnologies
```

Then populate the `up()` method:

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`
    ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "technologies" JSONB NOT NULL DEFAULT '[]'::jsonb
  `);
}

public async down(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`
    ALTER TABLE "users"
    DROP COLUMN IF EXISTS "technologies"
  `);
}
```

This is **safe to run on production** because:
- `ADD COLUMN IF NOT EXISTS` will no-op if the column already exists
- `NOT NULL DEFAULT '[]'::jsonb` will backfill all existing rows with `[]`
- No data is deleted

---

## E. Baseline vs Incremental Migration Recommendation

### E.1 Why NOT a Full Baseline Migration

A "baseline migration" that recreates the entire schema from scratch (all `CREATE TABLE` statements) is dangerous for this project because:

1. **The schema was built incrementally over months.** No single authoritative "initial state" SQL exists.
2. **Production has live data.** Running `CREATE TABLE` on existing tables would fail with `relation already exists` unless wrapped in `IF NOT EXISTS`, and even then does not account for column additions done over time.
3. **The column naming inconsistency** (camelCase vs snake_case in some tables) would need to be sorted out in the baseline definition.
4. **`InitialSchema` is already poorly named** — if a real baseline migration needs to be created later, there is already a file with that name in the migrations directory.

### E.2 Recommended Approach: Incremental with Manual Baseline Marker

**Do this instead:**

1. Treat the current production DB state as "ground truth" — do not try to recreate it via TypeORM.
2. Create the `typeorm_migrations` table manually with fake entries for any TypeORM migrations that were already applied (or whose effect already exists in production).
3. All FUTURE schema changes go through proper TypeORM migrations.
4. The `Data/` SQL files are archived as historical reference only — never to be run again on a DB that has already received them.

This approach:
- Requires zero downtime
- Requires no data movement
- Eliminates the risk of duplicate schema creation
- Gives you full migration tracking going forward

### E.3 Comparison Table

| Approach | Risk | Complexity | Downtime | Recommended |
|----------|------|-----------|----------|-------------|
| Full baseline recreation | HIGH | HIGH | YES | ❌ No |
| Drop + re-create from seed | VERY HIGH | MEDIUM | YES (data loss) | ❌ Never |
| Incremental with manual baseline marker | LOW | LOW | None | ✅ Yes |
| Continue ad-hoc SQL only | MEDIUM | LOW | None | ❌ No |

---

## F. Exact Future Migration Workflow

Every schema change from this point forward must follow this process:

### F.1 Development Workflow

```
1. Identify the schema change needed
   Example: "Add `resume_url` column to `rrfs`"

2. Create a new migration file
   cd rrf-portal-backend
   npx typeorm migration:create src/migrations/AddRrfResumeUrl

3. Implement up() and down() methods
   - up(): The forward change (ADD COLUMN, CREATE TABLE, etc.)
   - down(): The rollback (DROP COLUMN, DROP TABLE, etc.)
   - Always use ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS
   - Always implement down() — even if rollback seems unlikely

4. Add the entity column to the TypeScript entity
   user.entity.ts, rrf.entity.ts, etc.

5. Test locally
   npm run build
   npx typeorm migration:run -d dist/data-source.js

6. Verify with
   npx typeorm migration:show -d dist/data-source.js

7. Commit BOTH the migration file AND the entity change in the same commit
   git add src/migrations/TIMESTAMP-AddRrfResumeUrl.ts src/rrf/entities/rrf.entity.ts
   git commit -m "feat: add resume_url to rrfs"
```

### F.2 Migration File Template

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRrfResumeUrl1746100000000 implements MigrationInterface {
  name = 'AddRrfResumeUrl1746100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rrfs"
      ADD COLUMN IF NOT EXISTS "resume_url" VARCHAR(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rrfs"
      DROP COLUMN IF EXISTS "resume_url"
    `);
  }
}
```

### F.3 CI/CD Integration

Add to the CI/CD pipeline (GitHub Actions) **after** build and **before** server start:

```yaml
# In .github/workflows/deploy-backend.yml, after "npm run build"

- name: Run database migrations
  run: |
    cd rrf-portal-backend
    node dist/node_modules/.bin/typeorm migration:run -d dist/data-source.js
  env:
    DB_HOST: ${{ secrets.DB_HOST }}
    DB_PORT: ${{ secrets.DB_PORT }}
    DB_USERNAME: ${{ secrets.DB_USERNAME }}
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
    DB_DATABASE: ${{ secrets.DB_DATABASE }}
    DB_SSL: "true"
```

This ensures migrations run automatically on every deployment — before the new code starts.

---

## G. Migration Execution Strategy

### G.1 Auto vs Manual Execution

| Method | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| Auto in CI/CD pipeline | Zero human error, always runs before code | Harder to test rollback | ✅ Preferred for `up` |
| Manual via CLI | Full control, can inspect before running | Human error risk, easy to forget | ✅ For rollback (`down`) only |
| NestJS startup hook | Simple to add | Runs in the app process, harder to separate concerns | ❌ Avoid |

**Recommended:** Run migrations **automatically in CI/CD** via `typeorm migration:run` before PM2 restart. This decouples the migration concern from the application startup.

### G.2 Migration CLI Commands Reference

```bash
# Show status of all migrations (pending vs applied)
npx typeorm migration:show -d dist/data-source.js

# Run all pending migrations
npx typeorm migration:run -d dist/data-source.js

# Rollback the last migration
npx typeorm migration:revert -d dist/data-source.js

# Generate a new migration from entity changes (NOT recommended — review output carefully)
npx typeorm migration:generate src/migrations/AutoGenerated -d dist/data-source.js

# Create empty migration file
npx typeorm migration:create src/migrations/MyMigrationName
```

> **Warning on `migration:generate`:** TypeORM's auto-generated migrations compare the entity decorators to the DB schema. If the DB schema was built via ad-hoc SQL with slightly different column names or constraints, TypeORM may generate DROP/recreate statements. Always review auto-generated migration output before committing.

### G.3 Pre-Run Checklist for Production

Before running any migration on production:
- [ ] Take a database backup (RDS snapshot or `pg_dump`)
- [ ] Verify `typeorm_migrations` table shows expected pending migrations
- [ ] Test the migration on a staging environment or a local copy of the production backup
- [ ] Confirm `down()` has been implemented and tested
- [ ] Have a rollback plan ready (`migration:revert` command + any manual data fixes)

---

## H. Table/Data Safety Strategy

### H.1 Column Addition Rules

All column additions must use `IF NOT EXISTS` and must be `nullable` OR have a `DEFAULT`:

```sql
-- CORRECT — safe to run on existing table with data
ALTER TABLE rrfs ADD COLUMN IF NOT EXISTS resume_url VARCHAR(500);

-- CORRECT — NOT NULL only if DEFAULT is provided
ALTER TABLE rrfs ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;

-- WRONG — will fail if rows exist (NOT NULL with no DEFAULT)
ALTER TABLE rrfs ADD COLUMN resume_url VARCHAR(500) NOT NULL;
```

### H.2 Column Removal Rules

Never remove a column directly in a migration that will be deployed alongside code that still references that column. Use a two-phase approach:

1. **Phase 1 (deploy):** Remove all code references to the column. Deploy.
2. **Phase 2 (next deploy):** Write migration to `DROP COLUMN`.

This prevents the in-flight case where old instances still reference the column.

### H.3 Table Removal Rules

Never DROP a table in a migration without:
1. Verifying no foreign keys reference it
2. Verifying no application code references it
3. Backing up the data first
4. A confirmed data retention decision

### H.4 Enum Changes

PostgreSQL enums cannot be modified in a single ALTER statement. To add a new enum value:

```sql
-- PostgreSQL 9.1+ supports ALTER TYPE ... ADD VALUE
ALTER TYPE rrf_status_enum ADD VALUE IF NOT EXISTS 'new_value';
```

To remove a value (risky): requires creating a new type, migrating, dropping the old type. Avoid this in production.

For the current project, `RrfStatus` is stored as `type: 'enum'` in the entity but the underlying PostgreSQL type should be verified. If it is stored as `VARCHAR` with a check constraint, the migration is simpler.

### H.5 Existing `Data/` SQL Files — Archival Policy

The SQL files in `Data/` have all been manually applied to production. Their role going forward:

| Policy | Detail |
|--------|--------|
| Archive — do not delete | Keep as historical record of what was applied and when |
| Never re-run on existing DBs | All are idempotent but their effects are already present |
| Use as reference for baseline | If someone needs to set up a fresh development DB, these files + TypeORM migrations represent the full schema history |
| Do not convert to TypeORM migrations | The production DB already has these changes. Converting now would require marking them all as applied, adding complexity for zero gain. |

---

## I. Seeding Strategy

### I.1 Current Seeding Architecture

`SeedService` (in `seed.service.ts`) is a NestJS service that seeds:
1. **Roles** — 5 roles (ADMIN, PMO, APPROVER, HR, HIRING_MANAGER)
2. **Functions** — functional categories
3. **Subfunctions** — sub-functional categories linked to Functions
4. **Modules** — RBAC module definitions
5. **Permissions** — RBAC permissions per module
6. **Role-Permissions** — assignment of permissions to roles
7. **Admin User** — default admin user via bcrypt hashed password
8. **Form Configs** — dynamic form field configuration

The seeder uses `findOne()` checks before inserting (upsert-style) making it idempotent. It is exposed via `SeedController` as HTTP endpoints (`POST /api/seed`).

### I.2 Seeding vs Migration: Separation of Concerns

| Concern | Belongs In |
|---------|-----------|
| Creating tables and columns | TypeORM migration |
| Initial reference data (roles, modules, permissions) | Seed service |
| Production data changes (normalizing statuses, backfills) | TypeORM migration `up()` |
| Form config options | Seed service (can be re-run safely) |
| Admin user creation | Seed service (idempotent) |

**Current Problem:** The `Data/` SQL files contain a mix of schema changes AND data seeding. Going forward, these should be cleanly separated:
- Schema → TypeORM migration
- Reference data → seed service or a dedicated migration's `up()` that uses `ON CONFLICT DO NOTHING`

### I.3 Recommended Seeding Approach Going Forward

For **development/staging** environments: the seed endpoint (`POST /api/seed/all`) is acceptable to seed initial data after running migrations.

For **production** — two options:

**Option A (Recommended):** Seed initial data via a migration's `up()` using `INSERT ... ON CONFLICT DO NOTHING`. This gives full tracking via `typeorm_migrations`.

```typescript
// In a migration file
public async up(queryRunner: QueryRunner): Promise<void> {
  // Schema first
  await queryRunner.query(`CREATE TABLE IF NOT EXISTS ...`);
  
  // Then seed minimal required data
  await queryRunner.query(`
    INSERT INTO roles (role_name, role_code, is_active)
    VALUES ('Admin', 'ADMIN', true)
    ON CONFLICT (role_code) DO NOTHING
  `);
}
```

**Option B:** Keep the HTTP seed endpoint (`/api/seed`) but protect it with admin authentication and allow it to be triggered once post-deployment.

The current project already does Option B. This is acceptable as long as:
1. The endpoint requires authentication (verify this is enforced)
2. All seed operations are idempotent (currently true)
3. The endpoint is never auto-called during app startup (it is not — it requires an explicit HTTP request)

---

## J. Final Recommended Architecture

### J.1 Immediate Actions (Before Next Deployment)

Priority order:

| Priority | Action | Risk If Skipped |
|----------|--------|-----------------|
| 1 | Run diagnostic queries (Section D.1) on production to determine migration table state | Cannot proceed safely without this |
| 2 | Fix `data-source.ts` — add SSL config | Migration CLI cannot connect to production |
| 3 | Create `AddUserTechnologies` migration (Section D.4) | Runtime crash when `technologies` field is read/written |
| 4 | Create `typeorm_migrations` table + insert baseline records (Section D.2) | `migration:run` will re-apply already-applied migrations |
| 5 | Run `npx typeorm migration:show` to confirm clean state | Verify before committing to CI/CD automation |

### J.2 Architecture Going Forward

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SCHEMA CHANGE LIFECYCLE                          │
│                                                                     │
│  Entity Change                                                      │
│  (TypeScript)                                                       │
│       │                                                             │
│       ▼                                                             │
│  New Migration File                                                 │
│  (src/migrations/TIMESTAMP-Name.ts)                                │
│       │                                                             │
│       ▼                                                             │
│  Commit both together ────────────────────────────────────────────  │
│       │                                                             │
│       ▼                                                             │
│  GitHub Actions CI/CD                                               │
│  1. npm run build                                                   │
│  2. typeorm migration:run ◄── NEW STEP                              │
│  3. PM2 restart                                                     │
│       │                                                             │
│       ▼                                                             │
│  typeorm_migrations table records the applied migration             │
│  Production DB in sync with entities                                │
└─────────────────────────────────────────────────────────────────────┘
```

### J.3 Files That Need Changes

| File | Change Needed |
|------|--------------|
| `rrf-portal-backend/data-source.ts` | Add SSL config (see Section D.3) |
| `rrf-portal-backend/src/migrations/` | Add `AddUserTechnologies` migration (see Section D.4) |
| `.github/workflows/deploy-backend.yml` | Add `migration:run` step (see Section F.3) |

### J.4 Files to Keep As-Is

| File | Reason |
|------|--------|
| `Data/*.sql` | Archive — historical record, do not modify or re-run |
| `src/migrations/1746028800000-CreateNotificationsTable.ts` | Good migration, keep. Mark as applied in `typeorm_migrations` if notifications table already exists in production. |
| `src/migrations/1776781548847-InitialSchema.ts` | Keep. The operation is safe (`ALTER COLUMN ... SET DEFAULT`). Mark as applied in `typeorm_migrations` if `status_history` already has the correct default. |
| `rrf-portal-backend/src/database/seed.service.ts` | Keep as-is — idempotent seeding is correct pattern |

### J.5 What NOT To Do

| Action | Reason |
|--------|--------|
| ❌ Run `typeorm migration:run` on production without first checking `typeorm_migrations` state | May re-apply already-applied migrations, causing SQL errors or duplicate data |
| ❌ Rename `InitialSchema` migration | Would break `typeorm_migrations` tracking if the entry already exists |
| ❌ Enable `synchronize: true` on any environment | Would auto-apply entity changes, potentially dropping columns |
| ❌ Write raw SQL files in `Data/` for new schema changes | Breaks the migration tracking contract going forward |
| ❌ Use `migration:generate` without reviewing output | Auto-generated migrations may include DROP/recreate operations if schema has drift |
| ❌ Run the `down()` migration for `CreateNotificationsTable` | Would drop the entire notifications table and all its data |

---

*Document generated: May 2026*  
*Verified against: `rrf-portal-backend/src/migrations/*`, `Data/*.sql`, `rrf-portal-backend/data-source.ts`, `rrf-portal-backend/src/config/typeorm.config.ts`, `rrf-portal-backend/src/app.module.ts`, entity files*
