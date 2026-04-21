# **RBAC SYSTEM DESIGN DOCUMENT**
## **RRF Management Portal - Role-Based Access Control**

**Version:** 1.0  
**Date:** March 30, 2026  
**Purpose:** Finalized RBAC design for production implementation  
**Project:** Resource Requisition Form (RRF) Management Portal

---

## **TABLE OF CONTENTS**

1. [Overview](#section-1-overview)
2. [Entities](#section-2-entities)
3. [Roles & Responsibilities](#section-3-roles--responsibilities)
4. [Modules](#section-4-modules)
5. [Permissions](#section-5-permissions)
6. [Relationships](#section-6-relationships)
7. [Final Tables](#section-7-final-tables)
8. [Entity-Relationship Diagram](#section-8-entity-relationship-diagram)
9. [Implementation Guide](#section-9-implementation-guide)

---

## **SECTION 1: OVERVIEW**

### **1.1 System Purpose**
This document defines the Role-Based Access Control (RBAC) structure for an RRF (Resource Requisition Form) Management Portal. The system manages hiring requests, approvals, and resource tracking across multiple departments.

### **1.2 System Roles**
- **Admin** - System administrator with full control
- **HR Team** - Human resources team managing hiring lifecycle
- **Hiring Manager** - Department managers raising resource requests
- **Approver** - Senior management approving requisitions
- **PMO** - Project Management Office overseeing resource allocation

### **1.3 Key Features**
- Department-based user organization
- Single role per user (simplicity)
- Module-based permission structure
- Action-level granular access control
- Scalable for future expansion

---

## **SECTION 2: ENTITIES**

### **2.1 User**
**Definition:** Individual person with system access  
**Purpose:** Represents employees who interact with the system  
**Key Attributes:** Email, name, department, assigned role  
**Business Rule:** Each user belongs to exactly one role at a time

### **2.2 Role**
**Definition:** Job function defining system access level  
**Purpose:** Groups users with similar responsibilities  
**Key Attributes:** Role name, code, priority level  
**Business Rule:** Roles are predefined and system-managed

### **2.3 Module**
**Definition:** Functional area or feature of the application  
**Purpose:** Logical grouping of related system features  
**Key Attributes:** Module name, route path, parent module  
**Business Rule:** Modules can be hierarchical (parent-child)

### **2.4 Permission**
**Definition:** Specific action allowed on a module  
**Purpose:** Granular control over what users can do  
**Key Attributes:** Action type, target module  
**Business Rule:** Permissions are always module-specific

---

## **SECTION 3: ROLES & RESPONSIBILITIES**

### **3.1 Admin**
**Level:** System Administrator  
**Primary Function:** Complete system control and configuration

**Capabilities:**
- ✅ Full access to all modules
- ✅ Create, edit, delete users
- ✅ Assign roles to users
- ✅ Configure system settings
- ✅ View all RRF requests across departments
- ✅ Override any approval decision
- ✅ Access all reports and analytics
- ✅ Manage master data (departments, locations, customers)

**Restrictions:** None

---

### **3.2 HR Team**
**Level:** Operational Management  
**Primary Function:** Execute hiring process and manage closed positions

**Capabilities:**
- ✅ View all approved RRF requests
- ✅ Update RRF status (open, in-progress, filled, closed)
- ✅ Add comments and hiring updates
- ✅ Mark positions as filled
- ✅ View hiring pipeline reports
- ✅ Export RRF data
- ✅ Access dashboard with hiring metrics
- ❌ Cannot approve/reject RRF requests
- ❌ Cannot create RRF requests (not their workflow)

**Restrictions:** Cannot modify RRF requisition details, cannot access user management

---

### **3.3 Hiring Manager**
**Level:** Requestor  
**Primary Function:** Initiate resource requisition requests

**Capabilities:**
- ✅ Create new RRF requests
- ✅ Save drafts
- ✅ Edit own draft/pending RRF requests
- ✅ Delete own draft RRF requests
- ✅ View own RRF request history
- ✅ View status of submitted requests
- ✅ Add comments on own requests
- ✅ Export own RRF data
- ✅ View department-specific dashboard
- ❌ Cannot view other managers' requests
- ❌ Cannot approve requests

**Restrictions:** Access limited to own department's requests only

---

### **3.4 Approver**
**Level:** Decision Maker  
**Primary Function:** Review and approve/reject resource requisitions

**Capabilities:**
- ✅ View all pending RRF requests
- ✅ Approve RRF requests
- ✅ Reject RRF requests with comments
- ✅ Put requests on hold
- ✅ View approval history
- ✅ View approval dashboard
- ✅ View reports on approvals
- ✅ Export approval data
- ❌ Cannot create RRF requests
- ❌ Cannot edit RRF details

**Restrictions:** Cannot modify RRF content, only approve/reject decisions

---

### **3.5 PMO (Project Management Office)**
**Level:** Strategic Oversight  
**Primary Function:** Monitor resource allocation and analytics

**Capabilities:**
- ✅ View all RRF requests (all statuses)
- ✅ Create RRF requests on behalf of hiring managers
- ✅ Edit any RRF request (before approval)
- ✅ Delete draft RRF requests
- ✅ View comprehensive analytics
- ✅ Access all reports and insights
- ✅ Export data for analysis
- ✅ Monitor approval bottlenecks
- ✅ Track resource utilization
- ✅ Manage opened positions
- ✅ Send requests to approvers
- ❌ Cannot approve/reject (conflict of interest)

**Restrictions:** Cannot perform approval actions

---

## **SECTION 4: MODULES**

### **4.1 Dashboard**
**Code:** `DASHBOARD`  
**Description:** Landing page with role-specific metrics and quick actions  
**Route:** `/dashboard`, `/pmo`, `/hr`, `/approver`

**Features:**
- Role-specific widgets
- Quick statistics (pending, approved, filled)
- Recent activity feed
- Action cards (create RRF, pending approvals)

---

### **4.2 RRF Management**
**Code:** `RRF`  
**Description:** Core module for creating and managing resource requisition forms  
**Route:** `/create-rrf`, `/my-requests`, `/pmo/create-rrf`

**Features:**
- Multi-step RRF creation wizard
- Draft save functionality
- RRF listing and filtering
- RRF detail view
- Status tracking
- Export to PDF

---

### **4.3 Approvals**
**Code:** `APPROVALS`  
**Description:** Workflow for reviewing and approving RRF requests  
**Route:** `/approver/pending`, `/approver/approved`

**Features:**
- Pending approvals queue
- Approval/rejection interface
- On-hold management
- Approval history
- Bulk actions

---

### **4.4 User Management**
**Code:** `USERS`  
**Description:** System user administration (Admin only)  
**Route:** `/admin/users`

**Features:**
- User listing
- Add/edit/delete users
- Role assignment
- User activation/deactivation
- Bulk user import

---

### **4.5 Reports & Insights**
**Code:** `REPORTS`  
**Description:** Analytics and reporting dashboard  
**Route:** `/reports`, `/pmo/reports`, `/approver/reports`

**Features:**
- Time-to-fill metrics
- Department-wise statistics
- Approval rate analytics
- Hiring pipeline visualization
- Custom report generation
- Data export (Excel, CSV)

---

### **4.6 Settings**
**Code:** `SETTINGS`  
**Description:** System configuration and master data  
**Route:** `/admin/settings`

**Features:**
- Department management
- Location master
- Customer/project master
- System preferences
- Email templates
- Notification settings

---

## **SECTION 5: PERMISSIONS**

### **5.1 Permission Actions**

| Action | Code | Description | Use Cases |
|--------|------|-------------|-----------|
| **Create** | `CREATE` | Add new records | Create RRF, Add user |
| **Read** | `READ` | View/access records | View dashboard, View RRF details |
| **Update** | `UPDATE` | Modify existing records | Edit RRF, Update user |
| **Delete** | `DELETE` | Remove records | Delete draft RRF, Remove user |
| **Approve** | `APPROVE` | Authorize requests | Approve RRF |
| **Reject** | `REJECT` | Decline requests | Reject RRF |
| **Export** | `EXPORT` | Download data | Export reports, PDF generation |

---

### **5.2 Permission-Module Mapping**

#### **Dashboard Module:**
- `READ` - View dashboard

#### **RRF Management Module:**
- `CREATE` - Create new RRF
- `READ` - View RRF list and details
- `UPDATE` - Edit RRF details
- `DELETE` - Delete draft RRF
- `EXPORT` - Export RRF to PDF

#### **Approvals Module:**
- `READ` - View pending approvals
- `APPROVE` - Approve RRF request
- `REJECT` - Reject RRF request
- `UPDATE` - Put on hold

#### **User Management Module:**
- `CREATE` - Add new users
- `READ` - View user list
- `UPDATE` - Edit user details
- `DELETE` - Remove users

#### **Reports Module:**
- `READ` - View reports
- `EXPORT` - Export report data

#### **Settings Module:**
- `READ` - View settings
- `UPDATE` - Modify settings
- `CREATE` - Add master data
- `DELETE` - Remove master data

---

### **5.3 Role-Permission Matrix**

| Module | Permission | Admin | HR | Hiring Mgr | Approver | PMO |
|--------|-----------|-------|----|-----------|---------|----|
| **Dashboard** | READ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **RRF** | CREATE | ✅ | ❌ | ✅ | ❌ | ✅ |
| **RRF** | READ | ✅ | ✅ | ✅ (own) | ✅ | ✅ |
| **RRF** | UPDATE | ✅ | ✅ | ✅ (own) | ❌ | ✅ |
| **RRF** | DELETE | ✅ | ❌ | ✅ (own) | ❌ | ✅ |
| **RRF** | EXPORT | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Approvals** | READ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Approvals** | APPROVE | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Approvals** | REJECT | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Users** | CREATE | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Users** | READ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Users** | UPDATE | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Users** | DELETE | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Reports** | READ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Reports** | EXPORT | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Settings** | READ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Settings** | UPDATE | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## **SECTION 6: RELATIONSHIPS**

### **6.1 User ↔ Role**
**Type:** Many-to-One (N:1)  
**Description:** Multiple users can have the same role  
**Implementation:** `users.role_id` → `roles.id` (Foreign Key)  
**Business Rule:** Each user has exactly one role

```
USERS (N) ────── belongs to ────── (1) ROLES
```

---

### **6.2 Module ↔ Permission**
**Type:** One-to-Many (1:N)  
**Description:** One module can have multiple permissions  
**Implementation:** `permissions.module_id` → `modules.id` (Foreign Key)  
**Business Rule:** Permissions cannot exist without a module

```
MODULES (1) ────── has ────── (N) PERMISSIONS
```

---

### **6.3 Role ↔ Permission**
**Type:** Many-to-Many (M:N)  
**Description:** Roles can have multiple permissions, permissions can belong to multiple roles  
**Implementation:** Junction table `role_permissions`  
**Business Rule:** This is the core RBAC mapping

```
ROLES (M) ──── role_permissions ──── (N) PERMISSIONS
```

---

### **6.4 Module Hierarchy**
**Type:** Self-Referential (1:N)  
**Description:** Modules can have parent-child relationships  
**Implementation:** `modules.parent_module_id` → `modules.id` (Self FK)  
**Business Rule:** Optional - supports nested menu structures

```
MODULES (1) ────── parent of ────── (N) MODULES
```

---

## **SECTION 7: FINAL TABLES**

### **7.1 USERS Table**

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    department VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active);
```

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique user identifier |
| `user_id` | VARCHAR(50) | UNIQUE, NOT NULL | Employee ID (e.g., "EMP001") |
| `email` | VARCHAR(100) | UNIQUE, NOT NULL | User email for login |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| `full_name` | VARCHAR(100) | NOT NULL | User's full name |
| `role_id` | INTEGER | NOT NULL, FK → roles.id | Assigned role |
| `department` | VARCHAR(100) | NULL | Department/team name |
| `phone` | VARCHAR(20) | NULL | Contact number |
| `is_active` | BOOLEAN | DEFAULT TRUE | Account status |
| `last_login` | TIMESTAMP | NULL | Last successful login |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Account creation time |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last profile update |

---

### **7.2 ROLES Table**

```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    role_code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_roles_is_active ON roles(is_active);
```

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique role identifier |
| `role_name` | VARCHAR(50) | UNIQUE, NOT NULL | Display name (e.g., "Hiring Manager") |
| `role_code` | VARCHAR(20) | UNIQUE, NOT NULL | Code (e.g., "HM", "PMO") |
| `description` | TEXT | NULL | Role purpose description |
| `priority` | INTEGER | DEFAULT 0 | Hierarchy level (higher = more privilege) |
| `is_active` | BOOLEAN | DEFAULT TRUE | Role availability status |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Role creation time |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last modification time |

**Seed Data:**
```sql
INSERT INTO roles (role_name, role_code, description, priority) VALUES
('Admin', 'ADMIN', 'System administrator with full access', 100),
('PMO', 'PMO', 'Project Management Office - resource oversight', 80),
('Approver', 'APR', 'Approves/rejects resource requisitions', 70),
('HR Team', 'HR', 'Manages hiring lifecycle', 60),
('Hiring Manager', 'HM', 'Creates resource requisition requests', 50);
```

---

### **7.3 MODULES Table**

```sql
CREATE TABLE modules (
    id SERIAL PRIMARY KEY,
    module_name VARCHAR(100) UNIQUE NOT NULL,
    module_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    parent_module_id INTEGER REFERENCES modules(id) ON DELETE SET NULL,
    route_path VARCHAR(255),
    icon VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_modules_parent_id ON modules(parent_module_id);
CREATE INDEX idx_modules_is_active ON modules(is_active);
```

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique module identifier |
| `module_name` | VARCHAR(100) | UNIQUE, NOT NULL | Display name (e.g., "RRF Management") |
| `module_code` | VARCHAR(50) | UNIQUE, NOT NULL | Code (e.g., "RRF", "DASHBOARD") |
| `description` | TEXT | NULL | Module purpose |
| `parent_module_id` | INTEGER | NULL, FK → modules.id | Parent module (for hierarchies) |
| `route_path` | VARCHAR(255) | NULL | Frontend route (e.g., "/create-rrf") |
| `icon` | VARCHAR(50) | NULL | UI icon identifier |
| `display_order` | INTEGER | DEFAULT 0 | Menu display order |
| `is_active` | BOOLEAN | DEFAULT TRUE | Module availability |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Module creation time |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last modification time |

**Seed Data:**
```sql
INSERT INTO modules (module_name, module_code, route_path, display_order) VALUES
('Dashboard', 'DASHBOARD', '/dashboard', 1),
('RRF Management', 'RRF', '/create-rrf', 2),
('Approvals', 'APPROVALS', '/approver/pending', 3),
('User Management', 'USERS', '/admin/users', 4),
('Reports', 'REPORTS', '/reports', 5),
('Settings', 'SETTINGS', '/admin/settings', 6);
```

---

### **7.4 PERMISSIONS Table**

```sql
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    permission_name VARCHAR(100) NOT NULL,
    permission_code VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_module_permission UNIQUE(module_id, permission_code)
);

CREATE INDEX idx_permissions_module_id ON permissions(module_id);
CREATE INDEX idx_permissions_is_active ON permissions(is_active);
```

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique permission identifier |
| `module_id` | INTEGER | NOT NULL, FK → modules.id | Target module |
| `permission_name` | VARCHAR(100) | NOT NULL | Display name (e.g., "Create RRF") |
| `permission_code` | VARCHAR(50) | NOT NULL | Action code (e.g., "CREATE") |
| `description` | TEXT | NULL | Permission purpose |
| `is_active` | BOOLEAN | DEFAULT TRUE | Permission availability |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Permission creation time |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last modification time |
| **UNIQUE** | - | (module_id, permission_code) | No duplicate actions per module |

---

### **7.5 ROLE_PERMISSIONS Table**

```sql
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_role_permission UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
```

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique mapping identifier |
| `role_id` | INTEGER | NOT NULL, FK → roles.id | Target role |
| `permission_id` | INTEGER | NOT NULL, FK → permissions.id | Granted permission |
| `granted_at` | TIMESTAMP | DEFAULT NOW() | When permission was granted |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation time |
| **UNIQUE** | - | (role_id, permission_id) | No duplicate mappings |

---

### **7.6 DEPARTMENTS Table (Optional Reference)**

```sql
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    dept_name VARCHAR(100) UNIQUE NOT NULL,
    dept_code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique department ID |
| `dept_name` | VARCHAR(100) | UNIQUE, NOT NULL | Department name |
| `dept_code` | VARCHAR(20) | UNIQUE, NOT NULL | Short code |
| `description` | TEXT | NULL | Department description |
| `is_active` | BOOLEAN | DEFAULT TRUE | Department status |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation time |

---

## **SECTION 8: ENTITY-RELATIONSHIP DIAGRAM**

### **8.1 Text-Based ER Diagram**

```
┌─────────────────────┐
│    DEPARTMENTS      │
│─────────────────────│
│ PK: id              │
│ UK: dept_name       │
│ UK: dept_code       │
│     description     │
│     is_active       │
└──────────┬──────────┘
           │
           │ 1:N
           │ (belongs to)
           │
┌──────────▼──────────┐           ┌─────────────────────┐
│       USERS         │           │       ROLES         │
│─────────────────────│           │─────────────────────│
│ PK: id              │    N:1    │ PK: id              │
│ UK: user_id         │◄──────────┤ UK: role_name       │
│ UK: email           │ (has role)│ UK: role_code       │
│ FK: role_id         │           │     description     │
│ FK: department      │           │     priority        │
│     password_hash   │           │     is_active       │
│     full_name       │           └──────────┬──────────┘
│     phone           │                      │
│     is_active       │                      │ 1:N
│     last_login      │                      │ (has permissions)
└─────────────────────┘                      │
                                             │
                              ┌──────────────▼───────────────┐
                              │    ROLE_PERMISSIONS          │
                              │──────────────────────────────│
                              │ PK: id                       │
                              │ FK: role_id      ────────────┤
                              │ FK: permission_id            │
                              │ UK: (role_id, permission_id) │
                              │     granted_at               │
                              └──────────────┬───────────────┘
                                             │
                                             │ N:1
                                             │ (grants)
                                             │
┌─────────────────────┐           ┌─────────▼────────────┐
│      MODULES        │           │    PERMISSIONS       │
│─────────────────────│    1:N    │──────────────────────│
│ PK: id              │◄──────────┤ PK: id               │
│ UK: module_name     │ (belongs  │ FK: module_id        │
│ UK: module_code     │    to)    │     permission_name  │
│ FK: parent_module_id├──┐        │     permission_code  │
│     description     │  │        │ UK: (module_id,      │
│     route_path      │  │        │      permission_code)│
│     icon            │  │        │     description      │
│     display_order   │  │        │     is_active        │
│     is_active       │  │        └──────────────────────┘
└─────────────────────┘  │
           ▲             │
           │             │
           └─────────────┘
           Self-referencing
           (parent-child)
```

---

### **8.2 Mermaid.js ER Diagram**

```mermaid
erDiagram
    DEPARTMENTS ||--o{ USERS : "belongs_to"
    ROLES ||--o{ USERS : "has_role"
    ROLES ||--o{ ROLE_PERMISSIONS : "has_permissions"
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : "granted_to"
    MODULES ||--o{ PERMISSIONS : "defines"
    MODULES ||--o{ MODULES : "parent_of"

    USERS {
        int id PK
        varchar user_id UK
        varchar email UK
        varchar password_hash
        varchar full_name
        int role_id FK
        varchar department FK
        varchar phone
        boolean is_active
        timestamp last_login
        timestamp created_at
        timestamp updated_at
    }

    ROLES {
        int id PK
        varchar role_name UK
        varchar role_code UK
        text description
        int priority
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    ROLE_PERMISSIONS {
        int id PK
        int role_id FK
        int permission_id FK
        timestamp granted_at
        timestamp created_at
    }

    PERMISSIONS {
        int id PK
        int module_id FK
        varchar permission_name
        varchar permission_code
        text description
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    MODULES {
        int id PK
        varchar module_name UK
        varchar module_code UK
        text description
        int parent_module_id FK
        varchar route_path
        varchar icon
        int display_order
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    DEPARTMENTS {
        int id PK
        varchar dept_name UK
        varchar dept_code UK
        text description
        boolean is_active
        timestamp created_at
    }
```

---

### **8.3 Relationship Explanations**

#### **1. DEPARTMENTS → USERS (1:N)**
- **Type:** One-to-Many
- **Description:** One department can have many users
- **Foreign Key:** `users.department` references `departments.dept_name`
- **Business Rule:** Users belong to one department
- **Cascade:** RESTRICT (cannot delete department with active users)

---

#### **2. ROLES → USERS (1:N)**
- **Type:** One-to-Many
- **Description:** One role can be assigned to multiple users
- **Foreign Key:** `users.role_id` references `roles.id`
- **Business Rule:** Each user has exactly one role at a time
- **Cascade:** RESTRICT (cannot delete role with assigned users)

---

#### **3. ROLES → ROLE_PERMISSIONS (1:N)**
- **Type:** One-to-Many (part of M:N with PERMISSIONS)
- **Description:** One role can have many permission mappings
- **Foreign Key:** `role_permissions.role_id` references `roles.id`
- **Business Rule:** Defines what a role can do
- **Cascade:** CASCADE (deleting role removes its permissions)

---

#### **4. PERMISSIONS → ROLE_PERMISSIONS (1:N)**
- **Type:** One-to-Many (part of M:N with ROLES)
- **Description:** One permission can be granted to multiple roles
- **Foreign Key:** `role_permissions.permission_id` references `permissions.id`
- **Business Rule:** Same permission can be shared across roles
- **Cascade:** CASCADE (deleting permission removes all role mappings)

---

#### **5. ROLES ↔ PERMISSIONS (M:N via ROLE_PERMISSIONS)**
- **Type:** Many-to-Many
- **Junction Table:** `role_permissions`
- **Description:** Core RBAC relationship - maps which roles have which permissions
- **Unique Constraint:** `(role_id, permission_id)` - prevents duplicate mappings
- **Business Rule:** This table controls all access rights in the system

---

#### **6. MODULES → PERMISSIONS (1:N)**
- **Type:** One-to-Many
- **Description:** One module can have multiple permissions (actions)
- **Foreign Key:** `permissions.module_id` references `modules.id`
- **Business Rule:** Permissions are always module-specific
- **Cascade:** CASCADE (deleting module removes its permissions)
- **Example:** "RRF Management" module has CREATE, READ, UPDATE, DELETE permissions

---

#### **7. MODULES → MODULES (Self-Referencing)**
- **Type:** One-to-Many (hierarchical)
- **Description:** Modules can have parent-child relationships for nested menu structures
- **Foreign Key:** `modules.parent_module_id` references `modules.id`
- **Business Rule:** Optional - allows organizing modules in tree structure
- **Cascade:** SET NULL (deleting parent doesn't delete children)
- **Example:** "Admin" → "User Management", "Settings"

---

### **8.4 Cardinality Summary**

| Relationship | From | To | Type | Junction Table |
|--------------|------|----|------|----------------|
| Department assignment | DEPARTMENTS | USERS | 1:N | - |
| Role assignment | ROLES | USERS | 1:N | - |
| Role permissions | ROLES | PERMISSIONS | M:N | role_permissions |
| Module permissions | MODULES | PERMISSIONS | 1:N | - |
| Module hierarchy | MODULES | MODULES | 1:N | - |

---

### **8.5 Visual Relationship Flow**

```
Permission Check Flow:
──────────────────────

USER (id=5, role_id=2)
    │
    │ FK: role_id
    ├──► ROLE (id=2, name="PMO")
    │        │
    │        │ via role_permissions
    │        ├──► ROLE_PERMISSION (role_id=2, permission_id=10)
    │                 │
    │                 │ FK: permission_id
    │                 ├──► PERMISSION (id=10, code="CREATE")
    │                          │
    │                          │ FK: module_id
    │                          └──► MODULE (id=2, code="RRF")
    │
    └──► Result: User has "CREATE" permission on "RRF" module
```

---

## **SECTION 9: IMPLEMENTATION GUIDE**

### **9.1 Database Setup Checklist**

#### **Step 1: Create Tables in Order**
```sql
-- Order matters due to foreign key dependencies
1. CREATE TABLE roles;
2. CREATE TABLE departments;
3. CREATE TABLE users;
4. CREATE TABLE modules;
5. CREATE TABLE permissions;
6. CREATE TABLE role_permissions;
```

#### **Step 2: Insert Seed Data**
```sql
-- 1. Roles (required before users)
INSERT INTO roles (role_name, role_code, priority) VALUES
('Admin', 'ADMIN', 100),
('PMO', 'PMO', 80),
('Approver', 'APR', 70),
('HR Team', 'HR', 60),
('Hiring Manager', 'HM', 50);

-- 2. Modules (required before permissions)
INSERT INTO modules (module_name, module_code, route_path, display_order) VALUES
('Dashboard', 'DASHBOARD', '/dashboard', 1),
('RRF Management', 'RRF', '/create-rrf', 2),
('Approvals', 'APPROVALS', '/approver/pending', 3),
('User Management', 'USERS', '/admin/users', 4),
('Reports', 'REPORTS', '/reports', 5),
('Settings', 'SETTINGS', '/admin/settings', 6);

-- 3. Permissions (required before role_permissions)
INSERT INTO permissions (module_id, permission_name, permission_code) VALUES
-- Dashboard
((SELECT id FROM modules WHERE module_code='DASHBOARD'), 'View Dashboard', 'READ'),

-- RRF Management
((SELECT id FROM modules WHERE module_code='RRF'), 'Create RRF', 'CREATE'),
((SELECT id FROM modules WHERE module_code='RRF'), 'View RRF', 'READ'),
((SELECT id FROM modules WHERE module_code='RRF'), 'Edit RRF', 'UPDATE'),
((SELECT id FROM modules WHERE module_code='RRF'), 'Delete RRF', 'DELETE'),
((SELECT id FROM modules WHERE module_code='RRF'), 'Export RRF', 'EXPORT'),

-- Approvals
((SELECT id FROM modules WHERE module_code='APPROVALS'), 'View Approvals', 'READ'),
((SELECT id FROM modules WHERE module_code='APPROVALS'), 'Approve RRF', 'APPROVE'),
((SELECT id FROM modules WHERE module_code='APPROVALS'), 'Reject RRF', 'REJECT'),

-- User Management
((SELECT id FROM modules WHERE module_code='USERS'), 'Create User', 'CREATE'),
((SELECT id FROM modules WHERE module_code='USERS'), 'View Users', 'READ'),
((SELECT id FROM modules WHERE module_code='USERS'), 'Edit User', 'UPDATE'),
((SELECT id FROM modules WHERE module_code='USERS'), 'Delete User', 'DELETE'),

-- Reports
((SELECT id FROM modules WHERE module_code='REPORTS'), 'View Reports', 'READ'),
((SELECT id FROM modules WHERE module_code='REPORTS'), 'Export Reports', 'EXPORT'),

-- Settings
((SELECT id FROM modules WHERE module_code='SETTINGS'), 'View Settings', 'READ'),
((SELECT id FROM modules WHERE module_code='SETTINGS'), 'Update Settings', 'UPDATE');

-- 4. Role-Permission Mapping
-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE role_code='ADMIN'),
    id
FROM permissions;

-- Hiring Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE role_code='HM'),
    p.id
FROM permissions p
JOIN modules m ON p.module_id = m.id
WHERE (m.module_code = 'DASHBOARD' AND p.permission_code = 'READ')
   OR (m.module_code = 'RRF' AND p.permission_code IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT'))
   OR (m.module_code = 'REPORTS' AND p.permission_code IN ('READ', 'EXPORT'));
```

---

### **9.2 Permission Check Queries**

#### **Check if user has specific permission:**
```sql
SELECT COUNT(*) > 0 AS has_permission
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN modules m ON p.module_id = m.id
WHERE u.id = :userId
  AND m.module_code = :moduleCode
  AND p.permission_code = :permissionCode
  AND u.is_active = TRUE
  AND r.is_active = TRUE
  AND m.is_active = TRUE
  AND p.is_active = TRUE;
```

#### **Get all user permissions:**
```sql
SELECT 
    m.module_code,
    m.module_name,
    p.permission_code,
    p.permission_name
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN modules m ON p.module_id = m.id
WHERE u.id = :userId
  AND u.is_active = TRUE
  AND r.is_active = TRUE
  AND m.is_active = TRUE
  AND p.is_active = TRUE
ORDER BY m.module_code, p.permission_code;
```

#### **Get user's accessible modules:**
```sql
SELECT DISTINCT
    m.module_code,
    m.module_name,
    m.route_path,
    m.icon,
    m.display_order
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN modules m ON p.module_id = m.id
WHERE u.id = :userId
  AND u.is_active = TRUE
  AND r.is_active = TRUE
  AND m.is_active = TRUE
ORDER BY m.display_order;
```

---

### **9.3 Backend Implementation (Pseudo-code)**

```javascript
// Middleware: Check Permission
async function checkPermission(moduleCode, permissionCode) {
  return async (req, res, next) => {
    const userId = req.user.id;
    
    const hasPermission = await db.query(`
      SELECT COUNT(*) > 0 AS has_permission
      FROM users u
      JOIN roles r ON u.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN modules m ON p.module_id = m.id
      WHERE u.id = $1 
        AND m.module_code = $2
        AND p.permission_code = $3
        AND u.is_active = TRUE
    `, [userId, moduleCode, permissionCode]);
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You do not have permission to perform this action'
      });
    }
    
    next();
  };
}

// Usage in routes
app.post('/api/rrf', 
  authenticate, // JWT verify
  checkPermission('RRF', 'CREATE'), // RBAC check
  createRRFController
);

app.get('/api/rrf/:id', 
  authenticate,
  checkPermission('RRF', 'READ'),
  getRRFController
);

app.put('/api/rrf/:id', 
  authenticate,
  checkPermission('RRF', 'UPDATE'),
  updateRRFController
);

app.delete('/api/rrf/:id', 
  authenticate,
  checkPermission('RRF', 'DELETE'),
  deleteRRFController
);

app.post('/api/rrf/:id/approve', 
  authenticate,
  checkPermission('APPROVALS', 'APPROVE'),
  approveRRFController
);
```

---

### **9.4 Frontend Implementation (Pseudo-code)**

```javascript
// React Context for Permissions
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  
  useEffect(() => {
    // Fetch user permissions on login
    async function loadPermissions() {
      const response = await fetch('/api/auth/permissions');
      const data = await response.json();
      setPermissions(data.permissions);
    }
    
    if (user) {
      loadPermissions();
    }
  }, [user]);
  
  const hasPermission = (moduleCode, permissionCode) => {
    return permissions.some(
      p => p.module_code === moduleCode && p.permission_code === permissionCode
    );
  };
  
  return (
    <AuthContext.Provider value={{ user, permissions, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

// Usage in Components
function RRFListPage() {
  const { hasPermission } = useAuth();
  
  return (
    <div>
      <h1>RRF Requests</h1>
      
      {hasPermission('RRF', 'CREATE') && (
        <button onClick={createNewRRF}>Create New RRF</button>
      )}
      
      <table>
        {rrfList.map(rrf => (
          <tr key={rrf.id}>
            <td>{rrf.title}</td>
            <td>
              {hasPermission('RRF', 'UPDATE') && (
                <button onClick={() => editRRF(rrf.id)}>Edit</button>
              )}
              {hasPermission('RRF', 'DELETE') && (
                <button onClick={() => deleteRRF(rrf.id)}>Delete</button>
              )}
            </td>
          </tr>
        ))}
      </table>
    </div>
  );
}

// Route Guards
function ProtectedRoute({ moduleCode, permissionCode, children }) {
  const { hasPermission } = useAuth();
  
  if (!hasPermission(moduleCode, permissionCode)) {
    return <Navigate to="/403" replace />;
  }
  
  return children;
}

// Usage in Routes
<Route path="/create-rrf" element={
  <ProtectedRoute moduleCode="RRF" permissionCode="CREATE">
    <CreateRRFPage />
  </ProtectedRoute>
} />

<Route path="/admin/users" element={
  <ProtectedRoute moduleCode="USERS" permissionCode="READ">
    <UserManagementPage />
  </ProtectedRoute>
} />
```

---

### **9.5 Performance Optimization**

#### **1. Cache User Permissions**
```javascript
// Backend: Cache in Redis
const cacheKey = `user:${userId}:permissions`;
let permissions = await redis.get(cacheKey);

if (!permissions) {
  permissions = await fetchPermissionsFromDB(userId);
  await redis.set(cacheKey, JSON.stringify(permissions), 'EX', 3600); // 1 hour
}
```

#### **2. Database Indexes**
```sql
-- Critical indexes for performance
CREATE INDEX idx_user_role_permissions ON role_permissions(role_id, permission_id);
CREATE INDEX idx_permission_module ON permissions(module_id, permission_code);
CREATE INDEX idx_users_active_role ON users(id, role_id) WHERE is_active = TRUE;
```

#### **3. Materialized View (Optional)**
```sql
-- Precompute user permissions for faster lookups
CREATE MATERIALIZED VIEW user_permissions_view AS
SELECT 
    u.id as user_id,
    m.module_code,
    p.permission_code
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN modules m ON p.module_id = m.id
WHERE u.is_active = TRUE
  AND r.is_active = TRUE
  AND m.is_active = TRUE
  AND p.is_active = TRUE;

-- Refresh when roles/permissions change
REFRESH MATERIALIZED VIEW user_permissions_view;
```

---

### **9.6 Testing Checklist**

#### **Unit Tests:**
- ✅ Test permission check query with valid user
- ✅ Test permission check query with invalid user
- ✅ Test permission check with inactive user
- ✅ Test permission check with inactive role
- ✅ Test role-permission mapping uniqueness

#### **Integration Tests:**
- ✅ Test API endpoint with authorized user
- ✅ Test API endpoint with unauthorized user (403 response)
- ✅ Test multi-role permission inheritance
- ✅ Test permission cache invalidation

#### **End-to-End Tests:**
- ✅ Login as Admin → verify full access
- ✅ Login as Hiring Manager → verify limited access
- ✅ Login as Approver → verify approval actions only
- ✅ Test UI elements show/hide based on permissions

---

### **9.7 Migration Strategy**

If implementing RBAC in existing system:

1. **Phase 1:** Database Setup
   - Create RBAC tables alongside existing schema
   - Do NOT drop existing authentication tables yet

2. **Phase 2:** Data Migration
   - Map existing user roles to new RBAC roles
   - Populate role_permissions based on current access patterns
   - Validate data integrity

3. **Phase 3:** Code Migration
   - Add RBAC checks alongside existing checks (both run)
   - Log discrepancies for review
   - Gradually remove old authorization code

4. **Phase 4:** Cleanup
   - Remove legacy role columns from users table
   - Drop unused authorization tables
   - Optimize queries and indexes

---

## **END OF DOCUMENT**

**Document Status:** ✅ Ready for Implementation  
**Last Updated:** March 30, 2026  
**Next Steps:** Database setup → Backend implementation → Frontend integration → Testing

---

**This RBAC design is:**
- ✅ Production-ready
- ✅ Scalable (supports millions of users/permissions)
- ✅ Flexible (easily add new roles/modules/permissions)
- ✅ Secure (granular access control)
- ✅ Performant (optimized with indexes and caching)
- ✅ Maintainable (clean normalized structure)

**Use this document as your single source of truth for RBAC implementation!** 🚀
