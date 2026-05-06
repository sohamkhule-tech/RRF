# Microsoft Login Implementation Plan

**Date:** May 5, 2026  
**Type:** Read-Only Architecture Analysis  
**Branch:** `feature/aws-setup`  
**Status:** Forensic Audit Complete — No Code Modified

---

## 1. Current Auth Architecture

### Backend (NestJS)

```
src/auth/
├── auth.controller.ts      → POST /auth/login (Local strategy)
├── auth.service.ts         → validateUser(), login(), verifyToken()
├── auth.module.ts          → Passport + JwtModule configured
├── jwt.strategy.ts         → Bearer token validation
├── jwt-auth.guard.ts       → Protects routes
├── local.strategy.ts       → userId + password validation
└── local-auth.guard.ts     → Guards login endpoint

src/guards/
└── permission.guard.ts     → RBAC enforcement per-endpoint

src/decorators/
├── current-user.decorator.ts       → @CurrentUser()
└── require-permission.decorator.ts → @RequirePermission('MODULE.ACTION')
```

### Current Login Flow

```
User submits { userId, password }
→ LocalAuthGuard triggers LocalStrategy
→ LocalStrategy calls AuthService.validateUser(userId, password)
→ AuthService calls UsersService.validateUser(userId, password)
→ UsersService.findByUserId(userId) → bcrypt.compare(password, user.passwordHash)
→ If valid + active: return user
→ AuthService.login(user):
    → PermissionsService.getUserPermissions(user.id)
    → UsersService.updateLastLogin(user.id)
    → JwtService.sign({ userId: user.id, sub: user.id, roleCode: user.role.roleCode })
    → Return { success, access_token, user: { id, userId, name, email, role, department, permissions } }
```

### JWT Payload Structure

```typescript
{
  userId: number;       // user.id
  sub: number;          // user.id (standard JWT claim)
  roleCode: string;     // e.g., 'ADMIN', 'PMO', 'APPROVER'
  iat: number;          // issued-at (auto)
  exp: number;          // expires-in (24h default)
}
```

### Frontend (Next.js)

```
contexts/AuthContext.jsx  → login(), logout(), user state, permissions
app/login/page.jsx        → Login form (userId + password)
lib/api/apiConfig.js      → Bearer token injection, 401 handling
utils/permissions.js      → getHomePageByRole(), canAccessRoute()
```

**Token Storage:** `localStorage` (`token`, `user`, `permissions`)

**Route Guard:** Client-side via AuthContext + role-based routing

---

## 2. Feasibility Verdict

### Can Microsoft Login Be Added Without Breaking Existing Architecture?

# ✅ **YES — Fully Feasible**

**Reasons:**

1. **JWT Issuance is Centralized**  
   `AuthService.login(user)` is the single function that signs JWT. Microsoft login simply needs to pass a validated `user` object to the same function.

2. **RBAC is JWT-Based, Not Auth-Method-Based**  
   Guards check `req.user.id` from the JWT. They don't know or care HOW the user authenticated.

3. **User Lookup by Email Exists**  
   `UsersService.findByEmail(email)` already exists and returns user with role loaded.

4. **No Session State to Break**  
   Pure stateless JWT. No sessions, no cookies, no server-side state.

5. **Frontend Context is Auth-Method Agnostic**  
   `AuthContext.login(userData, token)` accepts any user data + token. Doesn't care how they were obtained.

---

## 3. Hybrid Auth Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LOGIN PAGE                                      │
├─────────────────────────────────┬───────────────────────────────────┤
│  [User ID + Password Form]     │  [Sign in with Microsoft] button  │
│  Traditional login             │  OAuth2/OIDC flow                 │
└────────────────┬────────────────┴───────────────────┬───────────────┘
                 │                                     │
                 ▼                                     ▼
    POST /auth/login                    POST /auth/microsoft/callback
    { userId, password }                { idToken } (from MSAL)
                 │                                     │
                 ▼                                     ▼
    LocalStrategy                       Microsoft Token Validation
    bcrypt.compare()                    Verify signature via JWKS
                 │                                     │
                 ▼                                     ▼
    User found +                        Extract email from token
    password valid                      → UsersService.findByEmail()
                 │                                     │
                 ├───────────────────┐                 │
                 │                   │                 │
                 ▼                   ▼                 ▼
         ┌───────────────────────────────────────────────────┐
         │              SHARED: AuthService.login(user)        │
         │   → Same JWT signing                               │
         │   → Same permissions loading                       │
         │   → Same updateLastLogin()                         │
         │   → Same response format                           │
         └───────────────────────────────────────────────────┘
                 │
                 ▼
         { success, access_token, user: { id, role, permissions } }
                 │
                 ▼
         Frontend: AuthContext.login(userData, token)
         → Same localStorage storage
         → Same role routing
         → Same RBAC enforcement
```

### Key Design Principles

1. **Admin remains source of truth** — No auto-provisioning
2. **Both methods produce identical JWT** — Same payload, same signature
3. **All downstream systems unchanged** — Guards, decorators, permissions
4. **Frontend routing unchanged** — Same `getHomePageByRole()` logic

---

## 4. Password Coexistence Model

### Q: Will internal password still be required?

**YES** — Internal password remains required for users who login via userId+password.

**NO** — Microsoft-authenticated users bypass password entirely.

### Q: Can both auth methods coexist safely?

**YES** — They are completely independent paths that converge at `AuthService.login(user)`.

### Q: Should Microsoft login bypass internal password validation?

**YES** — Microsoft has already authenticated the user. Checking our internal password would be incorrect (user might not even have an internal password set — future consideration).

### How Backend Distinguishes Login Method

```
POST /auth/login              → LocalAuthGuard → password validation
POST /auth/microsoft/callback → MicrosoftAuthGuard → token validation

Both → AuthService.login(user) → Same JWT
```

No ambiguity. Different endpoints = different validation logic.

### Security: Email Alone Cannot Grant Access

```
Attacker knows: user@company.com
Attacker calls: POST /auth/microsoft/callback { idToken: "forged" }
Backend does:
  1. Validate idToken signature against Microsoft JWKS endpoint
  2. Verify token issuer = https://login.microsoftonline.com/{tenant}/v2.0
  3. Verify audience = our client_id
  4. Verify token not expired
  5. Verify nonce (anti-replay)
  6. Extract email from verified claims
  7. Look up user by email

Result: Forged token fails at step 1 (invalid signature)
```

**Critical:** The backend NEVER trusts email directly. It only accepts email from a cryptographically validated Microsoft ID token.

---

## 5. Required Backend Changes

### New Files Needed

```
src/auth/
├── microsoft-auth.controller.ts    → POST /auth/microsoft/callback
├── microsoft-auth.service.ts       → Token validation + user lookup
└── microsoft-auth.guard.ts         → Optional: Custom guard for MS endpoint
```

### File-by-File Specification

#### `src/auth/microsoft-auth.controller.ts`

```typescript
// Purpose: Handle Microsoft OAuth callback
// Endpoint: POST /auth/microsoft/callback
// Body: { idToken: string }
// Returns: Same format as /auth/login

@Controller('auth')
export class MicrosoftAuthController {
  constructor(
    private microsoftAuthService: MicrosoftAuthService,
    private authService: AuthService,
  ) {}

  @Post('microsoft/callback')
  @HttpCode(HttpStatus.OK)
  async microsoftLogin(@Body() body: { idToken: string }) {
    // 1. Validate Microsoft ID token
    const microsoftUser = await this.microsoftAuthService.validateToken(body.idToken);
    
    // 2. Look up user by verified email
    const user = await this.microsoftAuthService.findUserByMicrosoftEmail(microsoftUser.email);
    
    // 3. Issue JWT via shared login method
    return this.authService.login(user);
  }
}
```

#### `src/auth/microsoft-auth.service.ts`

```typescript
// Purpose: Validate Microsoft ID tokens, look up users
// Dependencies: jwks-rsa (for JWKS validation), UsersService

@Injectable()
export class MicrosoftAuthService {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  async validateToken(idToken: string): Promise<{ email: string; oid: string; name: string }> {
    // 1. Decode token header to get kid (key ID)
    // 2. Fetch public key from Microsoft JWKS endpoint
    // 3. Verify signature, issuer, audience, expiration
    // 4. Extract and return claims
  }

  async findUserByMicrosoftEmail(email: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      throw new UnauthorizedException(
        'No account found for this email. Please contact your administrator.'
      );
    }
    
    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated.');
    }
    
    return user;
  }
}
```

### Existing Files Modified (Minimal)

| File | Change | Impact |
|------|--------|--------|
| `auth.module.ts` | Add MicrosoftAuthController + MicrosoftAuthService to module | Low |
| `.env` | Add AZURE_* environment variables | None (config only) |

### NO Changes Required To

| File | Reason |
|------|--------|
| `auth.service.ts` | `login(user)` method already accepts any user object |
| `jwt.strategy.ts` | JWT validation doesn't care about auth method |
| `permission.guard.ts` | Checks user.id from JWT only |
| `local.strategy.ts` | Untouched — still handles password login |
| `users.service.ts` | `findByEmail()` already exists |
| `user.entity.ts` | Email already unique + indexed |

---

## 6. Required Frontend Changes

### New/Modified Files

| File | Type | Purpose |
|------|------|---------|
| `app/login/page.jsx` | Modified | Add "Sign in with Microsoft" button |
| `lib/auth/msalConfig.js` | New | MSAL configuration |
| `lib/auth/microsoftLogin.js` | New | MSAL login flow helper |

### Login Page Modification

```jsx
// Add below existing login form:
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-gray-300"></div>
  </div>
  <div className="relative text-center">
    <span className="bg-white px-4 text-sm text-gray-500">OR</span>
  </div>
</div>

<button onClick={handleMicrosoftLogin} className="...">
  <MicrosoftIcon /> Sign in with Microsoft
</button>
```

### Microsoft Login Implementation

```javascript
// lib/auth/msalConfig.js
export const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/login',
  },
  cache: {
    cacheLocation: 'sessionStorage',  // NOT localStorage (security)
    storeAuthStateInCookie: false,
  },
};
```

### Recommended Approach: **MSAL.js (Custom OAuth)** — NOT NextAuth

**Why NOT NextAuth:**
| Factor | NextAuth | Custom MSAL |
|--------|----------|-------------|
| Architecture change | Major — takes over auth flow | Minimal — additive |
| Session model | Server-side sessions / DB adapter | Frontend-only token relay |
| Compatibility | Requires adapting all API calls | Works with existing Bearer + localStorage |
| JWT compatibility | Uses its own JWT format | Passes token to YOUR backend to issue YOUR JWT |
| Risk | High risk of breaking existing flow | Zero risk — additive only |
| Complexity | Must configure callbacks, session provider | 2 files + 1 button |

**Verdict:** Custom MSAL.js flow is the **only** approach that avoids architecture refactor.

### Frontend Flow

```
1. User clicks "Sign in with Microsoft"
2. MSAL popup/redirect opens Microsoft login page
3. User authenticates with Microsoft (password, MFA, etc.)
4. Microsoft returns ID token to frontend
5. Frontend calls: POST /auth/microsoft/callback { idToken }
6. Backend validates + returns { access_token, user }
7. Frontend calls: AuthContext.login(data.user, data.access_token)
8. Same localStorage storage, same routing
```

### NO Changes Required To

| File | Reason |
|------|--------|
| `contexts/AuthContext.jsx` | `login(userData, token)` is auth-method agnostic |
| `lib/api/apiConfig.js` | Bearer token injection unchanged |
| `utils/permissions.js` | Role routing unchanged |
| Any protected page | JWT + RBAC unchanged |

---

## 7. Required New Files

### Complete File Plan

```
rrf-portal-backend/
└── src/auth/
    ├── microsoft-auth.controller.ts     [NEW] Callback endpoint
    └── microsoft-auth.service.ts        [NEW] Token validation logic

rrf-portal-nextjs/
└── lib/auth/
    ├── msalConfig.js                    [NEW] Azure AD configuration
    └── microsoftLogin.js                [NEW] MSAL login helper functions
```

**Total New Files: 4**

**Modified Files:**
- `rrf-portal-backend/src/auth/auth.module.ts` — Register new controller/service
- `rrf-portal-nextjs/app/login/page.jsx` — Add Microsoft button
- `.env` / `.env.example` — Add Azure environment variables

---

## 8. Required Schema Changes

### Analysis of Current `users` Table

| Column | Exists | Relevant | Verdict |
|--------|--------|----------|---------|
| `email` | ✅ YES | ✅ Primary lookup key for MS login | Already unique + indexed |
| `is_active` | ✅ YES | ✅ Gate for MS login | Already checked |
| `role_id` | ✅ YES | ✅ RBAC preserved | Already loaded eagerly |
| `last_login` | ✅ YES | ✅ Updated on any login | Already used |
| `password_hash` | ✅ YES | N/A for MS login | Not checked for MS path |

### Recommended Optional Columns

| Column | Required? | Rationale |
|--------|-----------|-----------|
| `microsoft_id` (VARCHAR(255), nullable) | 🟡 **RECOMMENDED** | Store Azure AD Object ID for stronger binding (email can change) |
| `auth_provider` (VARCHAR(20), nullable) | ❌ **NOT REQUIRED** | Both methods share same JWT; user can use either |
| `last_login_provider` (VARCHAR(20), nullable) | 🟡 **NICE-TO-HAVE** | Audit trail: "credential" vs "microsoft" |

### Verdict on Schema Changes

**Minimum viable:** ❌ **ZERO schema changes needed**

The current `email` column (unique, indexed) is sufficient for Microsoft login lookup. The `password_hash` column is simply not used in the Microsoft login path.

**Recommended (Phase 2):**
```typescript
// user.entity.ts - FUTURE OPTIONAL ADDITION
@Column({ name: 'microsoft_id', length: 255, nullable: true, unique: true })
microsoftId: string;

@Column({ name: 'last_login_provider', length: 20, nullable: true })
lastLoginProvider: string;  // 'credential' | 'microsoft'
```

**NOT required for initial implementation.** Can be added later without breaking anything.

---

## 9. Azure Portal Setup Steps

### Required Azure AD Configuration

#### Step 1: Register Application

1. Go to https://portal.azure.com
2. Navigate to **Azure Active Directory** → **App registrations** → **New registration**
3. Configure:
   ```
   Name: RRF Portal
   Supported account types: Accounts in this organizational directory only (Single tenant)
   Redirect URI (Web):
     - http://localhost:3000/login  (development)
     - https://rrfportal.company.com/login  (production)
   ```

#### Step 2: Configure Authentication

1. Navigate to **Authentication** tab
2. Under **Implicit grant and hybrid flows**:
   - ✅ ID tokens (for OpenID Connect sign-in)
3. Under **Supported account types**:
   - Single tenant (recommended for corporate)

#### Step 3: Get Required Values

```
Tenant ID:      Azure AD > Overview > Tenant ID
Client ID:      App Registration > Overview > Application (client) ID
Client Secret:  App Registration > Certificates & secrets > New client secret
```

#### Step 4: Configure API Permissions

```
Microsoft Graph:
  - openid          (Sign users in)
  - email           (View users' email address)
  - profile         (View users' basic profile)
```

**No admin consent required** for these basic scopes.

#### Step 5: Environment Variables

```env
# Backend (.env)
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Frontend (.env.local)
NEXT_PUBLIC_AZURE_CLIENT_ID=your-client-id
NEXT_PUBLIC_AZURE_TENANT_ID=your-tenant-id
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/login
```

#### Step 6: Domain Restriction (Optional but Recommended)

In Azure AD App Registration:
- Set **Supported account types** to "Single tenant"
- This restricts login to `@yourcompany.com` domain only

Alternatively, validate in backend:
```typescript
const allowedDomains = configService.get('AZURE_ALLOWED_DOMAINS')?.split(',');
if (allowedDomains && !allowedDomains.includes(email.split('@')[1])) {
  throw new UnauthorizedException('Email domain not allowed');
}
```

---

## 10. Security Considerations

### Token Validation (Critical)

| Attack | Protection | Implementation |
|--------|-----------|----------------|
| **Forged ID token** | JWKS signature verification | Validate against `https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys` |
| **Token replay** | Nonce validation + `exp` claim check | Store nonce on frontend, validate on backend |
| **Wrong audience** | `aud` claim validation | Must equal our `client_id` |
| **Wrong issuer** | `iss` claim validation | Must equal `https://login.microsoftonline.com/{tenant}/v2.0` |
| **Email spoofing** | Only accept verified emails from token | Never accept email from request body |
| **Inactive user** | `isActive` check | Already in current `findByEmail()` flow |
| **Domain bypass** | Backend domain whitelist | Validate email domain server-side |

### CSRF Protection

**Current state:** Not applicable — stateless JWT with no cookies  
**Microsoft flow:** MSAL handles CSRF via `state` parameter  
**Backend callback:** POST endpoint accepts `idToken` in body — CSRF N/A for API calls  

### Token Spoofing Prevention

```typescript
// Backend MUST do ALL of these:
async validateToken(idToken: string) {
  // 1. Decode without verification to get header.kid
  const header = decodeHeader(idToken);
  
  // 2. Fetch signing key from Microsoft JWKS endpoint (cached)
  const key = await getSigningKey(header.kid);
  
  // 3. Verify with ALL claims
  const payload = jwt.verify(idToken, key, {
    algorithms: ['RS256'],
    issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
    audience: CLIENT_ID,
    clockTolerance: 5,  // 5 seconds leeway
  });
  
  // 4. Additional checks
  if (!payload.email && !payload.preferred_username) {
    throw new Error('No email in token');
  }
  
  return { email: payload.email || payload.preferred_username, oid: payload.oid };
}
```

### Logout Handling

**Current:** Frontend clears localStorage → redirected to /login  
**With Microsoft:** Same + optionally redirect to Microsoft logout:
```
https://login.microsoftonline.com/{tenant}/oauth2/v2.0/logout?post_logout_redirect_uri=https://rrfportal.com/login
```

### Refresh Tokens

**Not needed for initial implementation.**  
Current architecture uses 24h JWT expiry. Microsoft login is one-time authentication event that results in the same 24h JWT.

### Session Fixation

**N/A** — No server-side sessions. Pure stateless JWT.

### Revoked User Protection

Already handled:
```typescript
// jwt.strategy.ts - validate()
const user = await this.usersService.findById(payload.sub);
if (!user || !user.isActive) {
  throw new UnauthorizedException('User not found or inactive');
}
```

Every protected request re-checks `isActive`. Deactivating a user immediately blocks ALL subsequent requests regardless of auth method.

---

## 11. Risks & Blockers

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Email mismatch between admin-created user and Microsoft account | 🟡 MEDIUM | Admin must use exact corporate email when creating users |
| Token validation library dependency | 🟢 LOW | Use well-maintained `jwks-rsa` + `jsonwebtoken` |
| Azure AD downtime | 🟢 LOW | Internal login still works as fallback |
| JWKS endpoint caching | 🟢 LOW | Cache signing keys for 24h, refresh on miss |
| Frontend MSAL bundle size | 🟡 MEDIUM | `@azure/msal-browser` adds ~40KB gzipped |

### Blockers

| Blocker | Status | Resolution |
|---------|--------|------------|
| Login page hardcoded to `localhost:4000` | 🔴 EXISTING | Must fix API URL to use env variable |
| No dedicated `data-source.ts` for CLI | 🟡 EXISTING | Only affects migrations, not this feature |
| No Azure AD tenant available | ❓ UNKNOWN | Requires Azure subscription + AD setup |

### Dependencies to Install

**Backend:**
```bash
npm install jwks-rsa jsonwebtoken
npm install -D @types/jsonwebtoken
```

**Frontend:**
```bash
npm install @azure/msal-browser
```

---

## 12. Final Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              RRF PORTAL - HYBRID AUTH                              │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                           FRONTEND (Next.js)                                 │  │
│  ├─────────────────────────────┬───────────────────────────────────────────────┤  │
│  │                             │                                                │  │
│  │  ┌────────────────────┐    │    ┌──────────────────────────────────────┐   │  │
│  │  │ Internal Login Form │    │    │ [Sign in with Microsoft] Button      │   │  │
│  │  │ userId + password   │    │    │ Uses @azure/msal-browser             │   │  │
│  │  └────────┬───────────┘    │    └───────────────┬──────────────────────┘   │  │
│  │           │                 │                    │                           │  │
│  │           │ POST            │                    │ 1. Opens popup/redirect   │  │
│  │           │ /auth/login     │                    │ 2. User signs in with MS  │  │
│  │           │                 │                    │ 3. MS returns ID token    │  │
│  │           │                 │                    │ 4. POST /auth/microsoft   │  │
│  │           │                 │                    │    /callback { idToken }  │  │
│  └───────────┼─────────────────┼────────────────────┼──────────────────────────┘  │
│              │                 │                    │                              │
├──────────────┼─────────────────┼────────────────────┼──────────────────────────────┤
│              │                 │                    │                              │
│  ┌───────────┼─────────────────┼────────────────────┼──────────────────────────┐  │
│  │           │      BACKEND (NestJS)               │                           │  │
│  │           ▼                 │                    ▼                           │  │
│  │  ┌─────────────────┐       │       ┌──────────────────────────────────┐    │  │
│  │  │ LocalAuthGuard   │       │       │ MicrosoftAuthController          │    │  │
│  │  │ LocalStrategy    │       │       │ POST /auth/microsoft/callback    │    │  │
│  │  │                  │       │       │                                  │    │  │
│  │  │ 1. findByUserId  │       │       │ 1. Decode ID token header       │    │  │
│  │  │ 2. bcrypt.compare│       │       │ 2. Fetch JWKS from Microsoft    │    │  │
│  │  │ 3. Check isActive│       │       │ 3. Verify signature + claims    │    │  │
│  │  │                  │       │       │ 4. Extract verified email       │    │  │
│  │  └────────┬─────────┘       │       │ 5. findByEmail(email)           │    │  │
│  │           │                 │       │ 6. Check exists + isActive      │    │  │
│  │           │                 │       └──────────────┬───────────────────┘    │  │
│  │           │                 │                      │                        │  │
│  │           ▼                 │                      ▼                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐       │  │
│  │  │            SHARED: AuthService.login(user)                       │       │  │
│  │  │                                                                  │       │  │
│  │  │   PermissionsService.getUserPermissions(user.id)                 │       │  │
│  │  │   UsersService.updateLastLogin(user.id)                          │       │  │
│  │  │   JwtService.sign({ userId, sub, roleCode })                    │       │  │
│  │  │                                                                  │       │  │
│  │  │   Returns: { success, access_token, user: { ... permissions } }  │       │  │
│  │  └──────────────────────────────┬──────────────────────────────────┘       │  │
│  │                                 │                                           │  │
│  └─────────────────────────────────┼───────────────────────────────────────────┘  │
│                                    │                                              │
├────────────────────────────────────┼──────────────────────────────────────────────┤
│                                    ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │         SHARED DOWNSTREAM (Unchanged by Microsoft Login)                     │  │
│  │                                                                              │  │
│  │   • JwtStrategy validates Bearer token (same JWT regardless of auth method) │  │
│  │   • PermissionGuard enforces RBAC (uses user.id from JWT)                   │  │
│  │   • @CurrentUser() decorator extracts user from request                     │  │
│  │   • @RequirePermission('MODULE.ACTION') checks specific permission          │  │
│  │   • Frontend: AuthContext stores token + user (auth-method agnostic)        │  │
│  │   • Frontend: getHomePageByRole() routes by role code (unchanged)           │  │
│  │   • Frontend: apiConfig.js sends Bearer token on all requests               │  │
│  │                                                                              │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                    │
├────────────────────────────────────────────────────────────────────────────────────┤
│  DATABASE (PostgreSQL)                                                             │
│                                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ users:   id | user_id | email (UNIQUE, INDEXED) | password_hash | role_id  │  │
│  │          full_name | department | is_active | last_login | technologies     │  │
│  │                                                                              │  │
│  │ ⚡ email is the JOIN POINT for Microsoft login                              │  │
│  │ ⚡ password_hash is NOT USED in Microsoft path                              │  │
│  │ ⚡ Same user can login via BOTH methods (email matches userId account)      │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Step-by-Step Implementation Plan

### Phase 1: Azure Setup (1 hour)

| Step | Action | Owner |
|------|--------|-------|
| 1.1 | Create Azure AD App Registration | DevOps/Admin |
| 1.2 | Configure redirect URIs | DevOps/Admin |
| 1.3 | Set supported account types to Single Tenant | DevOps/Admin |
| 1.4 | Grant openid + email + profile permissions | DevOps/Admin |
| 1.5 | Record Tenant ID + Client ID + Client Secret | DevOps/Admin |
| 1.6 | Add values to backend `.env` | Developer |
| 1.7 | Add NEXT_PUBLIC values to frontend `.env.local` | Developer |

### Phase 2: Backend Implementation (4 hours)

| Step | Action | File |
|------|--------|------|
| 2.1 | Install `jwks-rsa` + `jsonwebtoken` | `package.json` |
| 2.2 | Create `MicrosoftAuthService` | `src/auth/microsoft-auth.service.ts` |
| 2.3 | Implement token validation with JWKS | Same file |
| 2.4 | Implement user lookup + existence check | Same file |
| 2.5 | Create `MicrosoftAuthController` | `src/auth/microsoft-auth.controller.ts` |
| 2.6 | Create `POST /auth/microsoft/callback` endpoint | Same file |
| 2.7 | Register in `AuthModule` | `src/auth/auth.module.ts` |
| 2.8 | Add Azure env vars to config | `.env` / `.env.example` |
| 2.9 | Test with cURL / Postman | Manual |

### Phase 3: Frontend Implementation (3 hours)

| Step | Action | File |
|------|--------|------|
| 3.1 | Install `@azure/msal-browser` | `package.json` |
| 3.2 | Create MSAL configuration | `lib/auth/msalConfig.js` |
| 3.3 | Create Microsoft login helper | `lib/auth/microsoftLogin.js` |
| 3.4 | Add "Sign in with Microsoft" button to login page | `app/login/page.jsx` |
| 3.5 | Handle Microsoft login response + call backend | Same file |
| 3.6 | Handle errors ("Contact Administrator" message) | Same file |
| 3.7 | Test end-to-end flow | Manual |

### Phase 4: Testing & Security (2 hours)

| Step | Action |
|------|--------|
| 4.1 | Test: Valid Microsoft user → login success |
| 4.2 | Test: Unknown email → "Contact Administrator" |
| 4.3 | Test: Inactive user → denied |
| 4.4 | Test: Forged token → rejected |
| 4.5 | Test: Wrong tenant token → rejected |
| 4.6 | Test: Internal login still works |
| 4.7 | Test: Both methods produce same JWT format |
| 4.8 | Test: RBAC unchanged after Microsoft login |

### Phase 5: Production Readiness (1 hour)

| Step | Action |
|------|--------|
| 5.1 | Add production redirect URI to Azure |
| 5.2 | Set AZURE_ALLOWED_DOMAINS for email domain restriction |
| 5.3 | Verify JWKS caching behavior |
| 5.4 | Update documentation |
| 5.5 | Add to CI/CD environment variables |

---

## Summary

### What Changes

| Component | Change Level | Description |
|-----------|--------------|-------------|
| Backend | +2 files | MicrosoftAuthController + MicrosoftAuthService |
| Backend | ~1 file | AuthModule registration |
| Frontend | +2 files | msalConfig + microsoftLogin helper |
| Frontend | ~1 file | Login page (add button) |
| Config | ~2 files | .env additions |
| Database | None | Email already sufficient |
| RBAC | None | Completely unchanged |
| Guards | None | Completely unchanged |
| JWT | None | Same sign/verify flow |
| Routing | None | Same role-based routing |

### What Stays the Same

- ✅ `AuthService.login(user)` — unchanged
- ✅ `JwtStrategy` — unchanged
- ✅ `PermissionGuard` — unchanged
- ✅ `AuthContext` — unchanged
- ✅ `apiConfig.js` — unchanged
- ✅ `permissions.js` — unchanged
- ✅ All protected routes — unchanged
- ✅ User entity schema — unchanged
- ✅ Role/Permission system — unchanged
- ✅ Admin provisioning — unchanged
- ✅ Internal password login — unchanged

### Total Effort Estimate

| Phase | Hours |
|-------|-------|
| Azure Setup | 1h |
| Backend | 4h |
| Frontend | 3h |
| Testing | 2h |
| Production | 1h |
| **Total** | **11h** |

### Risk Level

🟢 **LOW** — Additive change only. No existing code refactored. No breaking changes. Full backward compatibility.

---

**Audit Completed:** May 5, 2026  
**Auditor:** GitHub Copilot  
**Code Modifications:** 0 (strict read-only)  
**Architecture Impact:** Minimal (additive only)  
**RBAC Compatibility:** 100% preserved  
**Verdict:** ✅ Fully feasible with zero architectural disruption
