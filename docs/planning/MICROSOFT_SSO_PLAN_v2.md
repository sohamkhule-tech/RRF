# Microsoft SSO Implementation Plan v2 — RRF Portal

> **Status:** PLAN ONLY — Awaiting approval before implementation  
> **Date:** 2026-05-05  
> **Architecture Reference:** FlowDesk Microsoft SSO (production-stable)  
> **Project:** RRF Portal (NestJS 10 + Next.js 14 + TypeORM + PostgreSQL)

---

## 1. Current Architecture Audit

### Backend Stack
| Layer | Technology | Details |
|-------|-----------|---------|
| Framework | NestJS 10 | REST API on port 4000 |
| ORM | TypeORM 0.3.19 | PostgreSQL, entity-based schema |
| Auth | Passport.js | LocalStrategy (userId/password) + JwtStrategy |
| JWT | @nestjs/jwt | Single access_token, 24h expiry, no refresh tokens |
| Password | bcrypt | saltRounds=10 |
| Rate Limit | @nestjs/throttler | Applied per-endpoint |
| Security | helmet, CORS, ValidationPipe | whitelist + forbidNonWhitelisted |

### Frontend Stack
| Layer | Technology | Details |
|-------|-----------|---------|
| Framework | Next.js 14.2.0 | App Router, client components |
| State | React Context (AuthContext) | user + token in localStorage |
| Auth Library | @azure/msal-browser 5.9.0 | Currently installed |
| UI | Ant Design 5 + TailwindCSS 3.4 | |
| Notifications | react-hot-toast | |

### Current Auth Flow (Local Login)
```
Login Page → POST /auth/login { userId, password }
→ Backend validates via LocalStrategy + bcrypt
→ Returns { success, access_token, user: { id, userId, name, email, role, department, permissions } }
→ Frontend stores token + user in localStorage
→ AuthContext.login() updates state
→ Redirect to role-based dashboard
```

### Key Observations
| Item | Status |
|------|--------|
| Refresh tokens | **NOT IMPLEMENTED** — single 24h access_token only |
| Token storage | localStorage (token, user, permissions) |
| Auth guard | ClientLayout.jsx useEffect — checks localStorage, redirects to /login |
| RBAC | Permission strings "MODULE.ACTION" loaded from DB at login |
| User entity | Has `passwordHash` (NOT NULL currently), `email`, `userId`, `role` relation |
| Roles | Separate `roles` table: id, roleName, roleCode, priority |
| Microsoft auth packages | Backend: `jwks-rsa`, `jsonwebtoken` | Frontend: `@azure/msal-browser` |

---

## 2. Problems in Current Microsoft Login Implementation

### Critical Architecture Problem

The current implementation uses **frontend-driven MSAL redirect flow**:
```
Frontend MSAL library → redirects to Microsoft → returns to /auth/callback
→ MSAL handleRedirectPromise() in browser → extracts ID token
→ Frontend POSTs idToken to backend → backend validates and returns JWT
```

**This is fundamentally different from the FlowDesk (production) architecture:**
```
Frontend click → GET backend /auth/microsoft → backend generates authUrl with signed state
→ Frontend redirects to Microsoft → Microsoft returns to /auth/callback?code=...&state=...
→ Frontend POSTs code+state to backend → backend exchanges code server-to-server
→ Backend validates + issues JWT → frontend stores tokens
```

### Specific Problems Found

| # | Problem | Root Cause | Impact |
|---|---------|-----------|--------|
| 1 | MSAL `handleRedirectPromise()` race conditions | Called multiple times due to React StrictMode, re-renders, Next.js hydration | Callback returns null, auth breaks |
| 2 | `interaction_in_progress` errors | MSAL singleton not properly guarded during concurrent initialization | Login button becomes permanently disabled |
| 3 | Hash fragment consumed before reading | MSAL clears URL hash during processing; if component re-mounts, hash is gone | Silent auth failure |
| 4 | No anti-CSRF protection | MSAL handles PKCE internally but there's no server-signed state parameter | Weaker security posture |
| 5 | Client secret not used | SPA flow (PKCE) doesn't use client_secret | Less secure than confidential client |
| 6 | No server-to-server token exchange | Frontend holds raw Microsoft tokens in browser memory | Larger attack surface |
| 7 | Callback page fragility | 10+ iterations of fixes (singleton guards, cancellation, hash-sniffing) | Unstable, hard to maintain |
| 8 | Debug log pollution | 15+ forensic console.logs across 4 files | Production-unsafe |
| 9 | `navigateToLoginRequestUrl: false` workaround | Fighting MSAL's built-in navigation behavior | Indicates wrong architecture |
| 10 | No logout flow for Microsoft | Only local logout exists | Incomplete SSO lifecycle |

### Root Cause Summary

**The MSAL browser library is designed for SPAs that fully own the page lifecycle (React SPA, Angular SPA)**. Next.js App Router with server components, hydration, and file-based routing creates an incompatible environment. Every "fix" was fighting this fundamental mismatch.

**The FlowDesk architecture (backend-driven OAuth)** eliminates ALL of these problems because:
- The frontend never touches Microsoft tokens directly
- The backend handles the full OAuth exchange server-to-server
- The callback page is a simple "extract params → POST to backend → done"
- No MSAL library needed on frontend
- No `handleRedirectPromise()`, no singleton issues, no race conditions

---

## 3. Keep / Modify / Remove Classification

### KEEP ✓

| File | Reason |
|------|--------|
| `rrf-portal-backend/src/auth/microsoft-auth.service.ts` — JWKS validation logic | Core token verification is correct. Will be extended with code exchange. |
| `rrf-portal-backend/src/auth/microsoft-auth.controller.ts` — endpoint structure | Route pattern is correct. Will modify to accept `code+state` instead of `idToken`. |
| `rrf-portal-backend/src/auth/auth.module.ts` — module registration | Already has MicrosoftAuthService + MicrosoftAuthController registered. |
| `rrf-portal-backend/.env` — Azure config vars | AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_ALLOWED_DOMAINS are correct. |
| `rrf-portal-nextjs/.env.local` — NEXT_PUBLIC_AZURE_CLIENT_ID, NEXT_PUBLIC_AZURE_TENANT_ID | Still needed for auth URL construction info display (optional). |
| `rrf-portal-nextjs/app/auth/callback/page.jsx` — route exists | The route path is correct. Content will be rewritten. |
| `rrf-portal-nextjs/components/ClientLayout.jsx` — /auth/callback exemption | Auth guard already exempts the callback route. |
| `rrf-portal-nextjs/contexts/AuthContext.jsx` — login()/logout() methods | Works perfectly for both local and SSO login convergence. |

### MODIFY ⚡

| File | Change Needed | Reason |
|------|--------------|--------|
| `microsoft-auth.service.ts` | Add: `getAuthUrl()`, `exchangeCodeForTokens()`, `validateState()`, `generateState()`. Modify: rename `validateToken()` for clarity | Backend must drive the OAuth flow |
| `microsoft-auth.controller.ts` | Add: `GET /auth/microsoft` route. Modify: `POST /auth/microsoft/callback` to accept `{ code, state }` instead of `{ idToken }` | Frontend sends code+state, not raw idToken |
| `rrf-portal-backend/.env` | Add: `AZURE_CLIENT_SECRET`, `AZURE_REDIRECT_URI` | Server-to-server code exchange needs client secret |
| `rrf-portal-nextjs/app/auth/callback/page.jsx` | Rewrite: extract `code` + `state` from URL query params → POST to backend | No more MSAL handleRedirectPromise |
| `rrf-portal-nextjs/app/login/page.jsx` | Modify: Microsoft button calls backend `/auth/microsoft` to get auth URL, then redirects | No more `microsoftLogin()` helper |
| `User entity` | Add: `authProvider` column (optional), `microsoftId` column (optional) | Track which users authenticated via Microsoft |

### REMOVE ✗

| File | Reason |
|------|--------|
| `rrf-portal-nextjs/lib/auth/msalConfig.js` | **DELETE** — MSAL browser library no longer needed. Backend drives OAuth. |
| `rrf-portal-nextjs/lib/auth/microsoftLogin.js` | **DELETE** — Frontend redirect initiation replaced by backend-provided auth URL. |
| `@azure/msal-browser` package | **UNINSTALL** — No longer needed. Eliminates all MSAL race conditions permanently. |
| `NEXT_PUBLIC_REDIRECT_URI` env var | **REMOVE** — Redirect URI is now a backend concern only. |

**Why remove MSAL entirely?**
- It was the source of ALL stability issues (race conditions, StrictMode, hash consumption)
- The backend-driven approach is strictly more secure (confidential client, server-to-server exchange)
- Simpler frontend code (zero auth library dependencies)
- The FlowDesk production system proves this architecture works

---

## 4. New Microsoft SSO Plan for RRF Portal

### Architecture Flow (Final)

```
┌─────────────────────────────────────────────────────────────────────┐
│  LOGIN PAGE                                                          │
│  User clicks "Sign in with Microsoft"                                │
│       │                                                              │
│       ▼                                                              │
│  GET /auth/microsoft                                                 │
│  Backend returns { authUrl: "https://login.microsoftonline.com/..." }│
│       │                                                              │
│       ▼                                                              │
│  window.location.href = authUrl                                      │
│  (User redirected to Microsoft login page)                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  MICROSOFT                                                           │
│  User authenticates + consents                                       │
│       │                                                              │
│       ▼                                                              │
│  302 Redirect → http://localhost:3000/auth/callback?code=xxx&state=yy│
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  CALLBACK PAGE (/auth/callback)                                      │
│  1. Extract `code` and `state` from URL searchParams                 │
│  2. POST /auth/microsoft/callback { code, state }                    │
│  3. Receive { success, access_token, user }                          │
│  4. AuthContext.login(user, access_token)                            │
│  5. router.replace(getHomePageByRole(user.role.code))                │
│                                                                      │
│  Error: Show message → redirect to /login after 3s                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Response Shape (Identical to Local Login)

```json
{
  "success": true,
  "access_token": "eyJhbG...",
  "user": {
    "id": 1,
    "userId": "john.doe",
    "name": "John Doe",
    "email": "john.doe@datafortune.com",
    "role": { "id": 2, "code": "HIRING_MANAGER", "name": "Hiring Manager" },
    "department": "Engineering",
    "permissions": ["RRF.CREATE", "RRF.VIEW", "RRF.EDIT"]
  }
}
```

---

### 4.1 Backend Changes

#### New Route: `GET /auth/microsoft`

```
Purpose: Generate Microsoft OAuth authorization URL with anti-CSRF state
Rate limit: 5 req/min per IP
Auth: None (pre-authentication)
Response: { authUrl: string }
```

**State parameter:**
- Signed JWT using the app's `JWT_SECRET`
- Payload: `{ purpose: 'microsoft_sso', timestamp: Date.now() }`
- Expiry: 10 minutes
- Prevents CSRF — callback validates this state before processing

**Auth URL construction:**
```
https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/authorize
  ?client_id={CLIENT_ID}
  &response_type=code
  &redirect_uri={REDIRECT_URI}
  &scope=openid profile email
  &state={signed_state_jwt}
  &response_mode=query
  &prompt=select_account
```

#### Modified Route: `POST /auth/microsoft/callback`

```
Purpose: Exchange authorization code for tokens, validate, issue app JWT
Rate limit: 10 req/min per IP
Auth: None (pre-authentication)
Body: { code: string, state: string }
Response: Same shape as POST /auth/login
```

**Processing steps:**
1. Validate `state` JWT (verify signature, check expiry, check purpose claim)
2. Exchange `code` for Microsoft tokens via server-to-server POST to:
   `https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token`
3. Validate the returned `id_token`:
   - JWKS signature verification (RS256)
   - Issuer: `https://login.microsoftonline.com/{TENANT_ID}/v2.0`
   - Audience: `{CLIENT_ID}`
   - Expiry check
   - Tenant ID match
4. Extract email from verified claims
5. Validate email domain against `AZURE_ALLOWED_DOMAINS`
6. Look up user by email in database (no auto-provisioning)
7. Verify user is active
8. Issue app JWT via existing `AuthService.login(user)`
9. Return identical response shape

#### New Environment Variables

```env
# Add to backend .env
AZURE_CLIENT_SECRET=<your-azure-app-client-secret>
AZURE_REDIRECT_URI=http://localhost:3000/auth/callback
```

#### Service Methods Summary

| Method | Purpose |
|--------|---------|
| `getAuthUrl()` | Build OAuth URL + generate signed state |
| `handleCallback(code, state)` | Orchestrates full validation chain |
| `validateState(state)` | Verify JWT state signature + expiry |
| `exchangeCodeForTokens(code)` | Server-to-server POST to Microsoft token endpoint |
| `validateIdToken(idToken)` | JWKS verification (existing, renamed for clarity) |
| `validateDomain(email)` | Check against AZURE_ALLOWED_DOMAINS |
| `findUserByMicrosoftEmail(email)` | Existing method — find user + check isActive |

#### DTO

```typescript
class MicrosoftCallbackDto {
  @IsString() @IsNotEmpty() @MaxLength(2048)
  code: string;

  @IsString() @IsNotEmpty() @MaxLength(1024)
  state: string;
}
```

---

### 4.2 Frontend Changes

#### Login Page (`app/login/page.jsx`)

Replace current `handleMicrosoftLogin`:
```
Current: calls microsoftLogin() → MSAL loginRedirect()
New: GET /auth/microsoft → receives { authUrl } → window.location.href = authUrl
```

No MSAL library involved. Simple HTTP request + redirect.

#### Callback Page (`app/auth/callback/page.jsx`)

Complete rewrite:
```
1. useEffect ([] dependency) — runs once on mount
2. Extract searchParams: code, state from window.location.search
3. If missing → redirect to /login
4. POST /auth/microsoft/callback { code, state }
5. On success → login(data.user, data.access_token) → redirect to dashboard
6. On error → show message → redirect to /login after 3s
```

No MSAL, no handleRedirectPromise, no hash parsing, no singleton guards.

#### Remove Files

- Delete `lib/auth/msalConfig.js`
- Delete `lib/auth/microsoftLogin.js`
- Run `npm uninstall @azure/msal-browser`

#### Remove Environment Variable

- Remove `NEXT_PUBLIC_REDIRECT_URI` from `.env.local` (redirect URI is backend-only now)

#### Keep

- `NEXT_PUBLIC_API_URL` — needed for backend calls
- `NEXT_PUBLIC_AZURE_CLIENT_ID` — can keep for informational display (optional)
- `NEXT_PUBLIC_AZURE_TENANT_ID` — can keep for informational display (optional)

---

### 4.3 Database Changes

#### Assessment: Schema Change Required? **OPTIONAL (Recommended)**

The current User entity has:
- `passwordHash: string` — **NOT NULL**
- No `authProvider` column
- No `microsoftId` column

**Current behavior:** Microsoft SSO users must already exist in the database (no auto-provisioning). An admin creates them with a userId + password + email. They can then log in via Microsoft if their email matches.

**This means:** SSO users ALSO have a password. They can log in either way. This is a valid "hybrid auth" approach and requires NO schema changes.

**However, for future-proofing**, the following OPTIONAL migration is recommended:

```sql
-- Optional: Track auth provider for audit purposes
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'LOCAL';
ALTER TABLE users ADD COLUMN microsoft_id VARCHAR(255) UNIQUE;

-- Make passwordHash nullable for future SSO-only users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
```

#### Recommendation: **Phase 1 = No schema change**

For the initial implementation:
- Users must be pre-created by admin (existing behavior)
- Users have both password and Microsoft login available
- No schema migration needed
- No backward compatibility risk

**Phase 2 (future):** Add `auth_provider` + `microsoft_id` columns for SSO-only users and audit trail.

---

### 4.4 Security

| Control | Implementation |
|---------|---------------|
| Anti-CSRF | `state` = signed JWT (JWT_SECRET, 10min TTL, `purpose: 'microsoft_sso'`) |
| Replay protection | State JWT has `iat` + 10min expiry — can't be reused after expiry |
| Domain restriction | Backend validates email domain against `AZURE_ALLOWED_DOMAINS` |
| Tenant validation | `tid` claim must match `AZURE_TENANT_ID` |
| Audience validation | `aud` claim must match `AZURE_CLIENT_ID` |
| Issuer validation | Must match `https://login.microsoftonline.com/{TENANT}/v2.0` |
| Signature verification | JWKS RS256 with cached keys (24h) and rate limiting |
| Client secret | Backend-only, never exposed to frontend |
| Code exchange | Server-to-server HTTPS POST, client_secret in body |
| Rate limiting | GET /auth/microsoft: 5/min, POST callback: 10/min |
| Input validation | DTO with @IsString @IsNotEmpty @MaxLength |
| CORS | Only localhost:3000 allowed (existing config) |
| Helmet | Security headers already enabled |

---

### 4.5 Logout

Current logout (`AuthContext.logout()`):
- Clears localStorage
- Sets user to null
- Redirects to /login

**For Microsoft SSO users:** This is sufficient. The app JWT is cleared, and the user must re-authenticate. Microsoft's session cookie in the browser means they won't need to re-enter credentials at Microsoft (this is expected SSO behavior).

**Optional enhancement (Phase 2):** Add a "Sign out of Microsoft too" option that redirects to:
```
https://login.microsoftonline.com/{TENANT}/oauth2/v2.0/logout
  ?post_logout_redirect_uri=http://localhost:3000/login
```

---

## 5. Implementation Phases

### Phase 1: Backend (2 steps)

**Step 1: Add environment variables**
- Add `AZURE_CLIENT_SECRET` and `AZURE_REDIRECT_URI` to `.env`
- These are required for server-to-server code exchange

**Step 2: Modify Microsoft Auth Service + Controller**
- Add `getAuthUrl()` method with state JWT generation
- Modify callback to accept `{ code, state }` instead of `{ idToken }`
- Add `exchangeCodeForTokens()` method (HTTP POST to Microsoft token endpoint)
- Add `validateState()` method
- Keep existing `validateIdToken()` (JWKS verification)
- Add `GET /auth/microsoft` route
- Modify `POST /auth/microsoft/callback` DTO and handler
- Add HTTP calls (use `fetch` or install `@nestjs/axios`)

### Phase 2: Frontend (3 steps)

**Step 3: Remove MSAL**
- `npm uninstall @azure/msal-browser`
- Delete `lib/auth/msalConfig.js`
- Delete `lib/auth/microsoftLogin.js`
- Remove `NEXT_PUBLIC_REDIRECT_URI` from `.env.local`

**Step 4: Rewrite callback page**
- Simple: extract searchParams → POST to backend → login → redirect
- No auth libraries, no hooks complexity, no race conditions

**Step 5: Update login page**
- Microsoft button: GET /auth/microsoft → redirect to authUrl
- Remove microsoftLogin import
- Remove stale MSAL-related code

### Phase 3: Verification

**Step 6: End-to-end testing**
- Full flow test
- Error scenarios
- Edge cases

---

## 6. Risk Areas

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Azure App Registration not configured as "Web" type | Medium | Verify in Azure Portal: Authentication → Platform → Web (not SPA) |
| Client secret not generated | Medium | Azure Portal → Certificates & secrets → New client secret |
| Redirect URI mismatch | High | Must be `http://localhost:3000/auth/callback` registered as Web platform |
| CORS blocking backend→Microsoft calls | Low | Server-to-server calls don't go through browser CORS |
| Users not pre-created in DB | Medium | Admin must create users first; clear error message for unmatched emails |
| `response_mode=query` sends code in URL (logging risk) | Low | Code is single-use and short-lived (10min). Don't log request params. |
| State JWT using same secret as auth JWT | Low | Acceptable — add `purpose` claim to prevent cross-use |
| Next.js App Router dynamic searchParams | Low | Use `useSearchParams()` hook or `window.location.search` in client component |

### Azure Portal Checklist (Pre-Implementation)

Before implementation starts, verify:

- [ ] App Registration type is **Web** (not SPA)
- [ ] Redirect URI `http://localhost:3000/auth/callback` registered under Web platform
- [ ] Client secret generated and noted
- [ ] API Permissions: `openid`, `profile`, `email` (delegated) — should already be present
- [ ] ID tokens checkbox: **enabled** under Authentication → Implicit grant
- [ ] Token configuration: ensure `email` claim is included (may need optional claims config)

> **CRITICAL:** If the current Azure App Registration is type "SPA", it must be changed to "Web" (or a redirect URI added under "Web" platform). SPA registrations don't support client_secret-based code exchange.

---

## 7. Final Recommended Architecture Decision

### Decision: **Backend-Driven Authorization Code Flow (Confidential Client)**

| Criterion | Current (MSAL Browser) | Proposed (Backend OAuth) |
|-----------|----------------------|-------------------------|
| Security | PKCE only (public client) | Client secret + PKCE (confidential client) |
| Stability | Fragile (10+ bug fixes) | Rock-solid (simple HTTP calls) |
| Frontend complexity | High (MSAL singleton, race conditions) | Minimal (GET + redirect + POST) |
| StrictMode safe | Requires workarounds | Naturally safe |
| Next.js compatible | Poor (hydration conflicts) | Perfect (just a client page) |
| Token handling | Browser holds Microsoft tokens | Backend-only, never exposed |
| Dependencies | @azure/msal-browser (heavy) | None on frontend |
| Maintenance | MSAL version upgrades can break | Standard OAuth2, no library lock-in |
| Production proven | No (10+ iterations, still flaky) | Yes (FlowDesk production) |

### Summary

Remove `@azure/msal-browser` entirely. Move all OAuth logic to the backend. The frontend becomes a thin redirect client: get URL → redirect → extract params → POST → done.

This eliminates every single bug class encountered in the previous implementation:
- No `handleRedirectPromise` → no race conditions
- No MSAL singleton → no `interaction_in_progress`  
- No hash fragment parsing → no lost tokens
- No StrictMode conflicts → no guards/cancellation needed
- No frontend auth library → no version/compatibility issues

---

## Appendix: Dependency Changes

### Backend — Add

| Package | Purpose |
|---------|---------|
| (none new) | `jsonwebtoken` already installed for state JWT signing. `jwks-rsa` already installed for JWKS. HTTP fetch available natively in Node 18+. |

### Frontend — Remove

| Package | Reason |
|---------|--------|
| `@azure/msal-browser` | No longer needed — backend handles OAuth |

### Frontend — Add

| Package | Reason |
|---------|--------|
| (none) | Standard fetch() + Next.js routing is sufficient |

---

## Approval Checklist

- [ ] Architecture approved
- [ ] Azure Portal "Web" platform confirmed
- [ ] Client secret generated and available
- [ ] `AZURE_CLIENT_SECRET` value ready
- [ ] `AZURE_REDIRECT_URI` value confirmed
- [ ] Implementation can begin
