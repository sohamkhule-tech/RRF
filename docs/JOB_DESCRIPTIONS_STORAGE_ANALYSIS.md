# Job Descriptions Storage & Mapping Analysis

**Date:** May 8, 2026  
**Module:** `job-descriptions`  
**Analysis Type:** Data Model & Behavior Analysis (Read-Only)  
**Purpose:** Determine whether Job Descriptions override each other or coexist as separate records

---

## Executive Summary

Job Descriptions in the RRF Portal backend are stored as **independent, reusable templates** with **soft uniqueness enforcement**. The system implements **idempotent creation** at the application level, preventing exact duplicates (same `title` + `subFunction` combination) but allowing multiple JDs with the same title if they belong to different subfunctions. There are **no database-level unique constraints**, meaning multiple records can theoretically coexist, but the service layer returns the existing record instead of creating duplicates.

**Key Finding:** Job Descriptions **do NOT override each other** — they coexist as separate records, but the API prevents creating exact duplicates by returning the existing entry.

---

## 1. Data Model Overview

### Entity Structure

**File:** `src/job-descriptions/job-description.entity.ts`

```typescript
@Entity('job_descriptions')
@Index(['title'])
@Index(['subFunction'])
@Index(['createdById'])
export class JobDescription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  description: string;

  @Column({ nullable: true })
  subFunction: string;

  @Column({ name: 'created_by_id' })
  createdById: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### Database Schema

**Source:** `Data/add-job-descriptions-table.sql`

```sql
CREATE TABLE IF NOT EXISTS job_descriptions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    subFunction VARCHAR(255) NULL,
    created_by_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_job_description_created_by FOREIGN KEY (created_by_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes (NOT unique)
CREATE INDEX IF NOT EXISTS idx_job_descriptions_title ON job_descriptions(title);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_subfunction ON job_descriptions(subFunction);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_created_by ON job_descriptions(created_by_id);
```

---

## 2. Relationships & Mappings

### JobDescription → User (Many-to-One)

- **Relationship:** `@ManyToOne(() => User)`
- **Foreign Key:** `created_by_id` → `users(id)` with `ON DELETE CASCADE`
- **Behavior:** Multiple users can create their own job descriptions
- **Ownership:** Each JD is "owned" by the user who created it (`createdById`)

### JobDescription ↔ Subfunction (String-based, NOT relational)

- **Storage:** `subFunction` stored as `VARCHAR(255)` — **not a foreign key**
- **Relationship Type:** Logical association only (string match), not enforced at DB level
- **Nullable:** `subFunction` can be `NULL` (indicates "global" or "unassigned" template)
- **Impact:** 
  - No referential integrity — subfunctions can be deleted without affecting JDs
  - JDs can reference non-existent subfunctions (string value persists)
  - Filtering is done via string comparison, not joins

### JobDescription ↔ RRF (No Direct Relationship)

**File:** `src/rrf/entities/rrf.entity.ts` (line 140)

```typescript
@Column({ name: 'job_description', type: 'text', nullable: true })
jobDescription: string;
```

- **Storage in RRF:** `job_description` is a `TEXT` field, **not a foreign key**
- **Relationship Type:** None — RRF stores the job description **content as a copied string**, not a reference to the JobDescription entity
- **Implication:** 
  - Deleting a JobDescription template does NOT affect existing RRFs
  - RRFs snapshot the job description content at creation time
  - Updating a JobDescription template does NOT retroactively update RRFs
  - Job descriptions serve as **reusable templates**, not live-linked data

---

## 3. Constraints Analysis

### Database-Level Constraints

| Constraint Type | Column(s) | Status | Notes |
|---|---|---|---|
| **PRIMARY KEY** | `id` | ✅ Enforced | Auto-incrementing SERIAL |
| **FOREIGN KEY** | `created_by_id` → `users(id)` | ✅ Enforced | Cascade delete on user removal |
| **UNIQUE** | `title` | ❌ **NOT enforced** | Only a non-unique index exists |
| **UNIQUE** | `subFunction` | ❌ **NOT enforced** | Only a non-unique index exists |
| **UNIQUE** | `(title, subFunction)` | ❌ **NOT enforced** | No composite unique constraint |
| **NOT NULL** | `title`, `description`, `created_by_id` | ✅ Enforced | Required fields |
| **CHECK** | None | ❌ None | No domain validation at DB level |

**Critical Finding:** The database schema allows **multiple rows with identical `title` and `subFunction` values**. Uniqueness is enforced only at the application layer (see Service Logic section).

### Application-Level Validation

**File:** `src/job-descriptions/dto/create-job-description.dto.ts`

```typescript
export class CreateJobDescriptionDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(255, { message: 'Title cannot exceed 255 characters' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  description: string;

  @IsString()
  @IsOptional()
  subFunction?: string;
}
```

**Validation Rules:**
- `title`: 3–255 characters, required, string
- `description`: Minimum 10 characters, required
- `subFunction`: Optional string (no length constraint)

**No uniqueness validation at DTO level** — uniqueness is handled in the service layer.

---

## 4. Create vs Update Behavior

### Create Logic

**File:** `src/job-descriptions/job-descriptions.service.ts` (lines 54–73)

```typescript
async create(createDto: CreateJobDescriptionDto, userId: number): Promise<JobDescription> {
  const normalizedTitle = createDto.title.trim();
  
  // Check for duplicate title (Case-insensitive + SubFunction match)
  const existing = await this.jobDescriptionRepository.findOne({
    where: { 
      title: ILike(normalizedTitle),
      subFunction: createDto.subFunction || null 
    },
  });

  if (existing) {
    return existing; // Idempotent: return existing instead of error
  }

  const jobDescription = this.jobDescriptionRepository.create({
    ...createDto,
    title: normalizedTitle,
    createdById: userId,
  });

  return this.jobDescriptionRepository.save(jobDescription);
}
```

**Behavior Analysis:**

1. **Normalization:** Trims whitespace from `title`
2. **Duplicate Check:** Performs case-insensitive search using `ILike` for:
   - Exact `title` match (case-insensitive)
   - AND exact `subFunction` match (or both `NULL`)
3. **Idempotent Response:** If a duplicate exists, **returns the existing record** instead of:
   - Throwing an error
   - Creating a duplicate
   - Updating the existing record
4. **New Record Creation:** Only creates a new record if no match is found

**Edge Cases:**

| Scenario | Behavior |
|---|---|
| Same title, same subFunction, different user | Returns existing (does NOT create new) |
| Same title, different subFunction | Creates new record (different context) |
| Same title, one NULL subFunction, one specific subFunction | Creates new record (treated as different) |
| Case variations ("React Developer" vs "react developer") | Returns existing (case-insensitive match) |
| Leading/trailing spaces | Normalized away, returns existing |

### Update Logic

**File:** `src/job-descriptions/job-descriptions.service.ts` (lines 78–97)

```typescript
async update(id: number, updateDto: UpdateJobDescriptionDto): Promise<JobDescription> {
  const jobDescription = await this.findOne(id);

  // Check for duplicate title if title is being updated
  if (updateDto.title && updateDto.title !== jobDescription.title) {
    const existing = await this.jobDescriptionRepository.findOne({
      where: { title: updateDto.title },
    });

    if (existing) {
      throw new BadRequestException(`Job Description with title "${updateDto.title}" already exists`);
    }
  }

  Object.assign(jobDescription, updateDto);
  return this.jobDescriptionRepository.save(jobDescription);
}
```

**Behavior Analysis:**

1. **Finds existing record** by ID (throws `NotFoundException` if not found)
2. **Title uniqueness check:** Only if `title` is being changed
   - ⚠️ **Bug:** This check does NOT consider `subFunction` — only checks `title` globally
   - **Implication:** Cannot update title to a value that already exists anywhere, even if `subFunction` differs
3. **Throws error on conflict** (unlike create which returns existing)
4. **Updates in-place:** Merges changes into existing entity and saves

**Inconsistency:** Update logic is **more restrictive** than create logic:
- **Create:** Allows same title with different subFunction
- **Update:** Blocks changing title to any existing title, regardless of subFunction

---

## 5. Multi-User Scenario Analysis

### Scenario 1: Two Users Create JD with Same Title & SubFunction

**Setup:**
- User A (ID 1) creates: `{ title: "React Developer", subFunction: "Frontend" }`
- User B (ID 2) creates: `{ title: "React Developer", subFunction: "Frontend" }`

**Outcome:**
1. User A's request creates a new record (ID 1)
2. User B's request finds existing record (ID 1) via case-insensitive + subFunction match
3. **User B receives the same JobDescription entity created by User A**
4. `created_by_id` remains 1 (User A), not updated to User B

**Database State:**
```
| id | title            | subFunction | created_by_id |
|----|------------------|-------------|---------------|
| 1  | React Developer  | Frontend    | 1             |
```

**Key Insight:** **Only one record exists** — the system is idempotent and does NOT create duplicates.

---

### Scenario 2: Two Users Create JD with Same Title, Different SubFunction

**Setup:**
- User A creates: `{ title: "React Developer", subFunction: "Frontend" }`
- User B creates: `{ title: "React Developer", subFunction: "Mobile" }`

**Outcome:**
1. User A's request creates record ID 1
2. User B's request finds **no match** (subFunction differs)
3. User B's request creates a **new record** (ID 2)

**Database State:**
```
| id | title            | subFunction | created_by_id |
|----|------------------|-------------|---------------|
| 1  | React Developer  | Frontend    | 1             |
| 2  | React Developer  | Mobile      | 2             |
```

**Key Insight:** **Multiple records with same title** are allowed if `subFunction` differs — they represent different contexts.

---

### Scenario 3: Global Template (NULL subFunction) vs Specific Template

**Setup:**
- User A creates: `{ title: "Backend Engineer", subFunction: null }`
- User B creates: `{ title: "Backend Engineer", subFunction: "API" }`

**Outcome:**
1. User A's request creates record ID 1 (global template)
2. User B's request finds **no match** (NULL ≠ "API")
3. User B's request creates a **new record** (ID 2)

**Database State:**
```
| id | title             | subFunction | created_by_id |
|----|-------------------|-------------|---------------|
| 1  | Backend Engineer  | NULL        | 1             |
| 2  | Backend Engineer  | API         | 2             |
```

**Retrieval Behavior (via GET /job-descriptions?subFunction=API):**

**File:** `src/job-descriptions/job-descriptions.service.ts` (lines 20–32)

```typescript
async findAll(subFunction?: string): Promise<JobDescription[]> {
  const where = subFunction 
    ? [{ subFunction }, { subFunction: null }] // Match specific OR global
    : {}; // All if none specified

  return this.jobDescriptionRepository.find({
    where,
    relations: ['createdBy'],
    order: { createdAt: 'DESC' },
    take: 20,
  });
}
```

When fetching with `?subFunction=API`, the API returns:
- Record ID 2 (exact match: `subFunction = "API"`)
- **AND** Record ID 1 (global fallback: `subFunction IS NULL`)

**Key Insight:** Global templates (NULL subFunction) act as **fallbacks** and are returned alongside specific templates.

---

### Scenario 4: User Updates Their Own JD Title to an Existing Title

**Setup:**
- Record 1: `{ title: "Senior Developer", subFunction: "Frontend", created_by_id: 1 }`
- Record 2: `{ title: "Junior Developer", subFunction: "Frontend", created_by_id: 1 }`
- User A (ID 1) updates Record 2's title to "Senior Developer"

**Outcome:**
1. Update logic checks if "Senior Developer" already exists (finds Record 1)
2. Throws `BadRequestException`: `"Job Description with title 'Senior Developer' already exists"`
3. **Update is blocked**, even though both records belong to the same user and same subFunction

**Key Insight:** Update logic enforces **global title uniqueness**, stricter than create logic (which allows same title with different subFunction).

---

## 6. Retrieval & Filtering Logic

### GET /job-descriptions (All Templates)

**Query:** No parameters

**Behavior:**
- Returns all job descriptions (up to 20, most recent first)
- Includes `createdBy` user details (eager loaded)
- No filtering applied

---

### GET /job-descriptions?subFunction=X (Filtered Templates)

**Query:** `?subFunction=Frontend`

**Behavior:**
- Returns templates where `subFunction = "Frontend"` **OR** `subFunction IS NULL`
- Global templates (NULL subFunction) act as fallbacks for all subfunctions
- Ordered by `created_at DESC`, limited to 20 results

**SQL Equivalent:**
```sql
SELECT * FROM job_descriptions
WHERE subFunction = 'Frontend' OR subFunction IS NULL
ORDER BY created_at DESC
LIMIT 20;
```

---

### GET /job-descriptions/:id (Single Template)

**Behavior:**
- Fetches by primary key `id`
- Throws `NotFoundException` if not found
- Includes `createdBy` relation

---

## 7. Permission & Access Control

**File:** `src/job-descriptions/job-descriptions.controller.ts`

| Endpoint | Method | Permission Required | Who Can Access |
|---|---|---|---|
| `GET /job-descriptions` | GET | None (authenticated only) | All authenticated users |
| `GET /job-descriptions/:id` | GET | None (authenticated only) | All authenticated users |
| `POST /job-descriptions` | POST | `create_rrf` | Users with RRF create permission |
| `PUT /job-descriptions/:id` | PUT | `update_rrf` | Users with RRF update permission |
| `DELETE /job-descriptions/:id` | DELETE | `delete_rrf` | Users with RRF delete permission |

**Key Points:**
- **No ownership validation** — any user with `update_rrf` can update **any** JD, regardless of who created it
- **No deletion protection** — any user with `delete_rrf` can delete any JD
- **Read access is open** to all authenticated users (no permission check)

---

## 8. Data Integrity & Orphan Risk

### Cascade Delete on User Removal

**Schema:** `ON DELETE CASCADE` on `created_by_id` foreign key

**Behavior:** If a user is deleted, **all their job descriptions are automatically deleted**

**Risk Assessment:**
- ✅ **Low risk for templates** — JDs are reusable templates, not critical transactional data
- ⚠️ **Medium risk if widely used** — deleting a user removes all their contributed templates
- ✅ **No orphan RRFs** — RRFs store job description content as text, not foreign keys

---

### Orphan SubFunction References

**Current State:** `subFunction` is stored as a string, NOT a foreign key to `subfunctions` table

**Risks:**
1. **Stale references:** If a subfunction is renamed/deleted, JD records retain old string value
2. **No cascade updates:** Changing subfunction name doesn't update existing JDs
3. **Invalid references possible:** JDs can reference non-existent subfunctions

**Recommendation (out of scope):** Migrate to foreign key relationship for referential integrity

---

## 9. Final Conclusion

### Do Job Descriptions Override Each Other?

**Answer:** **NO** — Job Descriptions do **NOT override each other**. They coexist as separate records.

---

### Storage Behavior Summary

| Aspect | Behavior |
|---|---|
| **Storage Model** | Independent records in `job_descriptions` table |
| **Uniqueness Enforcement** | Application-level only (no DB constraints) |
| **Duplicate Handling (Create)** | Idempotent — returns existing if `(title, subFunction)` match |
| **Duplicate Handling (Update)** | Throws error if new title already exists globally |
| **Multi-User Conflicts** | Same `(title, subFunction)` → shares record; different `subFunction` → separate records |
| **Override Mechanism** | None — updates modify specific record by ID |
| **Deletion Impact** | Deletes specific record only; does not affect RRFs (they store text copy) |
| **Ownership** | Tracked via `created_by_id` but not enforced for updates/deletes |

---

### Key Takeaways for Developers

1. **Multiple JDs with same title are allowed** if `subFunction` differs
2. **Exact duplicates are prevented** via idempotent create logic
3. **Global templates (NULL subFunction)** are returned alongside specific templates when filtering
4. **RRFs do NOT reference JDs** — they copy the job description text at creation time
5. **Update logic is inconsistent** — more restrictive than create logic (global title uniqueness)
6. **No ownership-based access control** — any user with permissions can modify any JD
7. **Deleting a user cascades to their JDs** but does NOT affect existing RRFs

---

### Architectural Observations

**Strengths:**
- ✅ Idempotent API prevents accidental duplicates
- ✅ Global template fallback provides flexibility
- ✅ RRFs are decoupled from JD templates (snapshot model)
- ✅ Indexed for performance (title, subFunction, creator)

**Weaknesses:**
- ⚠️ No database-level uniqueness constraints (relies on application logic)
- ⚠️ Inconsistent duplicate handling between create and update
- ⚠️ `subFunction` stored as string, not foreign key (no referential integrity)
- ⚠️ No ownership validation (any admin can modify any JD)
- ⚠️ Update logic bug: doesn't consider `subFunction` when checking title uniqueness

**Potential Issues:**
1. If create logic is bypassed (e.g., direct DB insert), duplicates can exist
2. Update operation cannot change title to an existing title, even if `subFunction` differs (inconsistent with create)
3. Race conditions possible if two users simultaneously create the same `(title, subFunction)` pair

---

## Appendix: Code References

| File | Lines | Purpose |
|---|---|---|
| `job-description.entity.ts` | 1–45 | Entity definition, indexes, relationships |
| `job-descriptions.service.ts` | 54–73 | Create logic with idempotent duplicate handling |
| `job-descriptions.service.ts` | 78–97 | Update logic with global title uniqueness check |
| `job-descriptions.service.ts` | 20–32 | Retrieval logic with subFunction filtering |
| `create-job-description.dto.ts` | 1–16 | Validation rules for creating JDs |
| `job-descriptions.controller.ts` | 26–50 | API endpoints and permission requirements |
| `add-job-descriptions-table.sql` | 8–23 | Database schema with indexes and constraints |

---

**End of Analysis**
