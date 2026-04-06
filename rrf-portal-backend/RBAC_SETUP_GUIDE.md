# RBAC Backend Implementation Guide

## 🎯 Overview

This is a **complete, production-ready RBAC (Role-Based Access Control) system** for the RRF Portal backend built with NestJS, TypeORM, and PostgreSQL.

### Key Features
✅ **Database-driven** permissions (not hardcoded)  
✅ **Permission-based** authorization (not role-based checks)  
✅ **Secure** password hashing with bcrypt  
✅ **JWT** authentication with permission array  
✅ **PostgreSQL** database with TypeORM  
✅ **Permission Guards** on all protected endpoints  
✅ **Seed data** for quick setup  

---

## 📋 Prerequisites

1. **PostgreSQL** installed and running
2. **Node.js** 18+ installed
3. **Docker** (optional, for containerized setup)

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd rrf-portal-backend
npm install
```

### Step 2: Setup PostgreSQL Database

Create a PostgreSQL database named `rrf_portal`:

```sql
CREATE DATABASE rrf_portal;
```

Or use Docker:

```bash
docker run --name rrf-postgres \
  -e POSTGRES_DB=rrf_portal \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres123 \
  -p 5432:5432 \
  -d postgres:15
```

### Step 3: Configure Environment Variables

The `.env` file is already created with default values:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres123
DB_NAME=rrf_portal

# JWT Configuration
JWT_SECRET=RRF_PORTAL_SECRET_KEY_2026_SECURE_RANDOM_STRING

# Application
NODE_ENV=development
```

**⚠️ Important:** Change `JWT_SECRET` to a secure random string in production!

### Step 4: Start the Backend

```bash
npm run start:dev
```

You should see:
```
[Nest] 12345  - 03/30/2024, 10:00:00 AM     LOG [NestApplication] Nest application successfully started +2ms
Server running on http://localhost:4000
```

### Step 5: Seed the Database

Run this command to populate roles, modules, permissions, and demo users:

```bash
curl -X POST http://localhost:4000/seed
```

Or use Postman/Thunder Client:
- Method: `POST`
- URL: `http://localhost:4000/seed`

Expected Response:
```json
{
  "success": true,
  "message": "Database seeded successfully!"
}
```

---

## 👥 Demo Users

After seeding, you can login with these credentials:

| Role              | User ID    | Password | Permissions                                |
|-------------------|------------|----------|--------------------------------------------|
| **Admin**         | admin001   | admin123 | Full user/settings management              |
| **PMO**           | pmo001     | pmo123   | Full RRF management, view approvals        |
| **Approver**      | app001     | app123   | Approve/reject RRFs                        |
| **HR Team**       | hr001      | hr123    | View approved RRFs                         |
| **Hiring Manager**| hm001      | hm123    | Create RRFs                                |

---

## 🧪 Testing RBAC

### 1. Login as Hiring Manager

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "hm001",
    "password": "hm123"
  }'
```

**Response:**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 5,
    "userId": "hm001",
    "name": "John Doe",
    "email": "john.doe@company.com",
    "role": {
      "id": 5,
      "code": "HIRING_MANAGER",
      "name": "Hiring Manager"
    },
    "department": "Engineering",
    "permissions": [
      "DASHBOARD.READ",
      "RRF.CREATE",
      "RRF.READ",
      "RRF.UPDATE",
      "REPORTS.READ"
    ]
  }
}
```

**Copy the `access_token`** for next requests!

---

### 2. Create RRF (✅ Should Succeed - Hiring Manager has RRF.CREATE)

```bash
curl -X POST http://localhost:4000/rrf \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "positionTitle": "Senior Backend Developer",
    "department": "Engineering",
    "experience": "5-7 years",
    "skills": ["Node.js", "NestJS", "PostgreSQL"],
    "headcount": 2,
    "budgetRange": "15-20 LPA",
    "justification": "Team expansion for new project"
  }'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "RRF created successfully",
  "data": { ... }
}
```

---

### 3. Try to Delete RRF (❌ Should Fail - Hiring Manager lacks RRF.DELETE)

```bash
curl -X DELETE http://localhost:4000/rrf/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (403 Forbidden):**
```json
{
  "statusCode": 403,
  "message": "You do not have permission: RRF.DELETE",
  "error": "Forbidden"
}
```

---

### 4. Login as PMO and Delete RRF (✅ Should Succeed)

**Login:**
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "pmo001",
    "password": "pmo123"
  }'
```

**Delete (PMO has RRF.DELETE):**
```bash
curl -X DELETE http://localhost:4000/rrf/1 \
  -H "Authorization: Bearer PMO_ACCESS_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "RRF 1 deleted successfully"
}
```

---

### 5. Test Admin User Management (Admin Only)

**Login as Admin:**
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "admin001",
    "password": "admin123"
  }'
```

**Get User Profile (✅ All authenticated users):**
```bash
curl -X GET http://localhost:4000/users/profile \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

---

## 🔐 Security Features

### Permission Guard Flow

```
API Request
    ↓
[JwtAuthGuard] - Validates JWT token
    ↓
[PermissionGuard] - Checks @RequirePermission decorator
    ↓
PermissionsService.getUserPermissions()
    ↓
SQL Query: JOIN users → roles → role_permissions → permissions → modules
    ↓
Compare required permission vs user permissions
    ↓
✅ Allow (200 OK) or ❌ Deny (403 Forbidden)
```

### How to Protect New Endpoints

```typescript
@Controller('approvals')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ApprovalsController {
  
  @Post('approve/:id')
  @RequirePermission('APPROVALS.APPROVE')
  async approveRRF(@Param('id') id: string) {
    // Only users with APPROVALS.APPROVE permission can access
    return { success: true };
  }

  @Post('reject/:id')
  @RequirePermission('APPROVALS.REJECT')
  async rejectRRF(@Param('id') id: string) {
    // Only users with APPROVALS.REJECT permission can access
    return { success: true };
  }
}
```

---

## 📊 Database Schema

### Core Tables

1. **users** - User accounts
2. **roles** - Role definitions (Admin, PMO, HR, Approver, Hiring Manager)
3. **modules** - Feature modules (Dashboard, RRF, Approvals, Users, Reports, Settings)
4. **permissions** - Granular permissions (MODULE.ACTION format)
5. **role_permissions** - Junction table mapping roles to permissions

### Permission Format

```
MODULE.ACTION
```

Examples:
- `RRF.CREATE` - Create resource requisition
- `RRF.READ` - View resource requisitions
- `APPROVALS.APPROVE` - Approve RRFs
- `USERS.DELETE` - Deactivate users
- `REPORTS.EXPORT` - Export reports

---

## 🔧 Role-Permission Mapping

### Admin (System Administrator)
```
✅ DASHBOARD.READ
✅ USERS.CREATE, USERS.READ, USERS.UPDATE, USERS.DELETE
✅ REPORTS.READ, REPORTS.EXPORT
✅ SETTINGS.READ, SETTINGS.UPDATE
❌ No business operations (no RRF creation, no approvals)
```

### PMO (Project Management Office)
```
✅ DASHBOARD.READ
✅ RRF.CREATE, RRF.READ, RRF.UPDATE, RRF.DELETE
✅ APPROVALS.READ (view only)
✅ USERS.READ (view only)
✅ REPORTS.READ, REPORTS.EXPORT
```

### Approver (Department Head)
```
✅ DASHBOARD.READ
✅ RRF.READ
✅ APPROVALS.READ, APPROVALS.APPROVE, APPROVALS.REJECT
✅ REPORTS.READ
```

### HR Team
```
✅ DASHBOARD.READ
✅ RRF.READ (approved RRFs only)
✅ APPROVALS.READ
✅ REPORTS.READ, REPORTS.EXPORT
```

### Hiring Manager
```
✅ DASHBOARD.READ
✅ RRF.CREATE, RRF.READ, RRF.UPDATE
✅ REPORTS.READ
```

---

## 🛠️ Available Endpoints

### Authentication
- `POST /auth/login` - Login with userId and password
- `POST /auth/verify-token` - Validate JWT token

### Users
- `GET /users/profile` - Get current user profile (requires JWT)

### RRF (Resource Requisition)
- `POST /rrf` - Create RRF (requires `RRF.CREATE`)
- `GET /rrf` - List all RRFs (requires `RRF.READ`)
- `GET /rrf/:id` - Get RRF details (requires `RRF.READ`)
- `PUT /rrf/:id` - Update RRF (requires `RRF.UPDATE`)
- `DELETE /rrf/:id` - Delete RRF (requires `RRF.DELETE`)

### Seed (Development Only)
- `POST /seed` - Populate database with demo data

---

## 📝 Next Steps for Frontend

### 1. Update Login Logic

```typescript
// frontend/services/auth.service.ts
const response = await fetch('http://localhost:4000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, password }),
});

const { access_token, user } = await response.json();

// Store token and permissions
localStorage.setItem('access_token', access_token);
localStorage.setItem('permissions', JSON.stringify(user.permissions));
localStorage.setItem('user', JSON.stringify(user));
```

### 2. Create Permission Check Hook

```typescript
// frontend/hooks/usePermission.ts
export const usePermission = (requiredPermission: string) => {
  const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
  return permissions.includes(requiredPermission);
};

// Usage in components
const canCreateRRF = usePermission('RRF.CREATE');
const canApprove = usePermission('APPROVALS.APPROVE');

{canCreateRRF && <Button>Create RRF</Button>}
{canApprove && <Button>Approve</Button>}
```

### 3. Add Authorization Headers

```typescript
// frontend/api/client.ts
const apiClient = axios.create({
  baseURL: 'http://localhost:4000',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 🎓 RBAC Best Practices

### ✅ DO:
- **Check permissions**, not roles (use `APPROVALS.APPROVE`, not `role === 'approver'`)
- **Use permission guards** on all protected endpoints
- **Return permissions array** in login response
- **Validate permissions** on both frontend and backend
- **Store permissions** separately from user data
- **Revoke permissions** by updating role_permissions table (no code changes)

### ❌ DON'T:
- Hardcode role checks (`if (role === 'admin')`)
- Skip permission guards (`@Public()` decorator should be rare)
- Trust frontend-only validation
- Give admin role business operation permissions
- Mix authorization logic with business logic

---

## 🐛 Troubleshooting

### Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** Ensure PostgreSQL is running and credentials in `.env` are correct.

### Permission Denied (403)
```json
{ "statusCode": 403, "message": "You do not have permission: RRF.CREATE" }
```
**Solution:** 
1. Check user's role in database
2. Verify role has permission in `role_permissions` table
3. Re-seed database if needed: `POST /seed`

### JWT Token Invalid
```json
{ "statusCode": 401, "message": "Unauthorized" }
```
**Solution:** 
1. Login again to get new token
2. Ensure JWT_SECRET in `.env` matches
3. Check token expiry (default 24h)

---

## 📚 Technical Documentation

### File Structure
```
src/
├── auth/                # Authentication module (JWT, Passport)
├── users/               # User management
├── roles/               # Role definitions
├── modules/             # Feature modules
├── permissions/         # Permission checking service
├── role-permissions/    # Role-permission mappings
├── guards/              # Permission guard
├── decorators/          # @RequirePermission decorator
├── config/              # TypeORM configuration
├── database/            # Seed service
└── rrf/                 # Sample RRF module with protected endpoints
```

### Key Files
- `auth.service.ts` - Returns permissions array in login response
- `permissions.service.ts` - SQL query to fetch user permissions
- `permission.guard.ts` - Enforces permissions on protected endpoints
- `seed.service.ts` - Populates database with demo data
- `rrf.controller.ts` - Example controller with permission guards

---

## 🎉 Success Checklist

Before deploying:
- [ ] PostgreSQL database created
- [ ] `.env` configured with strong JWT secret
- [ ] Dependencies installed (`npm install`)
- [ ] Backend started successfully
- [ ] Database seeded (`POST /seed`)
- [ ] Tested login with all 5 roles
- [ ] Tested permission enforcement (403 for unauthorized actions)
- [ ] Frontend updated to store/check permissions
- [ ] Authorization headers added to API calls

---

## 📞 Support

For issues or questions:
1. Check backend logs: `npm run start:dev`
2. Verify database tables exist: `psql -d rrf_portal -c "\dt"`
3. Test login endpoint: `POST /auth/login`
4. Re-seed if needed: `POST /seed`

---

**🚀 Your RBAC backend is now ready for production!**
