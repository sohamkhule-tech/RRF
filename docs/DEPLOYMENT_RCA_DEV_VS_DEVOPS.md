# Root Cause Analysis: Dev Branch Deployment Failures vs Devops Branch

**Date:** May 8, 2026  
**Branches Compared:** `dev` vs `devops`  
**Analyst:** GitHub Copilot (read-only analysis — no code changes made)

---

## Executive Summary

The `dev` branch fails in production deployment for **four independent, compounding reasons** — none of which exist in the `devops` branch. The primary cause is the **backend receiving no environment variables at runtime**, which cascades into CORS failures, authentication failures, database connection errors, and 502 Bad Gateway responses. A secondary cause is a **hardcoded `http://localhost:4000`** in the normal login handler in the `dev` branch frontend, which was also present in `devops` but is masked there by the fact that `devops` doesn't have Microsoft login (which adds a dependency on `NEXT_PUBLIC_API_URL`). Additionally, the `dev` branch introduces **new Azure/MS auth env vars** that are never set in CI/CD.

---

## Section 1: GitHub Actions Workflow Differences

### File: `.github/workflows/backend-deploy-dev.yml`

This is the **single most critical difference** between the two branches.

#### devops branch — Backend Deploy Step

```yaml
- name: Deploy Backend
  env:
    DB_HOST:     ${{ secrets.DB_HOST }}
    DB_PORT:     ${{ secrets.DB_PORT }}
    DB_USERNAME: ${{ secrets.DB_USERNAME }}
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
    DB_DATABASE: ${{ secrets.DB_DATABASE }}
    JWT_SECRET:  ${{ secrets.JWT_SECRET }}
    JWT_EXPIRES_IN: ${{ secrets.JWT_EXPIRES_IN }}
    ALLOWED_ORIGINS: ${{ secrets.ALLOWED_ORIGINS }}
  run: |
    ssh ... << EOF
      cat > ecosystem.config.js << 'ECOSYSTEM'
      module.exports = {
        apps: [{ name: 'rrf-portal-backend', script: 'dist/src/main.js',
          env: {
            NODE_ENV: 'production',
            DB_HOST: '${DB_HOST}',
            ...all secrets baked in...
          }
        }]
      }
      ECOSYSTEM
      pm2 start ecosystem.config.js
    EOF
```

**All env vars are passed through GitHub Secrets → expanded in CI runner → written into PM2 ecosystem.config.js → baked into the PM2 process at startup.**

#### dev branch — Backend Deploy Step

```yaml
- name: Deploy Backend
  run: |
    ssh ... << 'EOF'
      if [ ! -f .env ]; then
        echo "⚠️ .env missing - please create it manually"
      fi
      pm2 start dist/src/main.js --name rrf-portal-backend
    EOF
```

**No env vars are passed at all.** The backend is started with `pm2 start` directly — no ecosystem file, no `--env` flags. The deploy script only checks if `.env` exists and prints a warning if it doesn't. It does NOT create it, inject it, or fail if it's missing.

**Impact:** If `.env` does not exist on the server (which is the normal state — it is excluded from `rsync` with `--exclude='.env'`), the backend starts with ALL environment variables as `undefined`.

---

### File: `.github/workflows/frontend-deploy-dev.yml`

#### devops branch — Build Frontend Step

```yaml
- name: Build Frontend
  working-directory: rrf-portal-nextjs
  env:
    NEXT_PUBLIC_API_URL: "http://13.126.110.36:4000/api"   # ← HARDCODED literal
  run: |
    npm ci --legacy-peer-deps
    npm run build
```

`NEXT_PUBLIC_API_URL` is a **literal hardcoded string** directly in the YAML. It is always present and always correct. No GitHub Secret dependency.

#### dev branch — Build Frontend Step

```yaml
- name: Build Frontend
  working-directory: rrf-portal-nextjs
  env:
    NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}   # ← From GitHub Secret
  run: |
    npm ci --legacy-peer-deps
    npm run build
```

`NEXT_PUBLIC_API_URL` is read from a **GitHub Secret named `NEXT_PUBLIC_API_URL`**. If that secret is not defined in the repository's `Settings → Secrets and variables → Actions`, the value expands to an **empty string** (`""`).

**Critical behavior with Next.js:** `NEXT_PUBLIC_*` variables are baked into the JavaScript bundle **at build time**. If the value is empty string at build time, every `apiConfig.js` call that does:

```js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
```

...evaluates `""` as falsy and falls back to `'http://localhost:4000'`. The built `.js` bundle then contains the literal string `http://localhost:4000` — and there is **no way to override it at runtime** because Next.js has already inlined the value.

---

### Additional rsync differences

| Item | devops | dev |
|---|---|---|
| Syncs `next.config.js` | No | Yes |
| Syncs `jsconfig.json` | No | Yes |
| PM2 start command | `pm2 start npm --name frontend -- start` | `pm2 start node_modules/next/dist/bin/next --name frontend -- start` |

The dev branch syncs `next.config.js` to the server (harmless) and uses a slightly different PM2 start method (both are functionally equivalent for `next start`).

---

## Section 2: Frontend API Configuration

### File: `rrf-portal-nextjs/lib/api/apiConfig.js`

**Identical in both branches.** The file contains:

```js
// Line 7 — module-level constant (never actually used)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Line 42 — inside apiRequest() — this IS the one used
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
```

> **Note:** There is a **variable shadowing bug** in this file — `API_BASE_URL` is declared twice (module level and inside `apiRequest`). The inner declaration always wins. The outer one is dead code. This is not the cause of failure but is a code quality issue.

All API calls routed through `apiConfig.js` (every file in `lib/api/`) correctly use `NEXT_PUBLIC_API_URL`. The problem is that when the secret is empty, the URL falls back to `localhost:4000` as explained above.

---

## Section 3: Login Page — Hardcoded URL

### File: `rrf-portal-nextjs/app/login/page.jsx`

#### devops branch — Normal login handler (line ~31)

```js
const response = await fetch('http://localhost:4000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, password }),
})
```

**Hardcoded `http://localhost:4000/auth/login`** — bypasses `apiConfig.js` entirely.

#### dev branch — Normal login handler (line ~277)

```js
const response = await fetch('http://localhost:4000/auth/login', {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify({ userId, password }),
})
```

**Same hardcoded `http://localhost:4000/auth/login`** — also bypasses `apiConfig.js`.

**Both branches have this same bug.** However, the impact differs:

- In `devops`, there is no `NEXT_PUBLIC_API_URL` GitHub Secret required. The build uses the hardcoded IP. The login page hitting `localhost:4000` from the browser fails just like in `dev` — BUT the user says devops works. This implies either: (a) they test devops locally where the backend IS on localhost, or (b) the frontend serves from the same EC2 machine and the browser is behind a VPN/proxy where `localhost:4000` is accessible. **Regardless, this is a latent bug in both branches.**

- In `dev`, this hardcoded URL causes the normal login to hit `http://localhost:4000` from the user's browser — i.e., the **user's own machine** — not the EC2 server. This is why "Login API fails" in dev deployment.

#### dev branch — Microsoft login handler (lines ~249-259)

```js
const res = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/microsoft`
)
```

**Microsoft login correctly uses `NEXT_PUBLIC_API_URL`** with localhost fallback. However:

1. If `NEXT_PUBLIC_API_URL` GitHub Secret is missing, this resolves to `http://localhost:4000/auth/microsoft` in the browser.
2. Even if `NEXT_PUBLIC_API_URL` is correctly set, the backend needs `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_REDIRECT_URI` to be set — and they are **not present anywhere in CI/CD**.

---

## Section 4: Backend Environment Variables

### Required by devops branch

| Variable | Source in CI | Used By |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | GitHub Secrets → PM2 ecosystem | TypeORM / database connection |
| `JWT_SECRET` | GitHub Secrets → PM2 ecosystem | `configService.getOrThrow('JWT_SECRET')` — **throws at startup if missing** |
| `JWT_EXPIRES_IN` | GitHub Secrets → PM2 ecosystem | JWT token expiry |
| `ALLOWED_ORIGINS` | GitHub Secrets → PM2 ecosystem | CORS allowed origins |
| `PORT` | Hardcoded as `4000` in ecosystem | Server listen port |

### Required by dev branch (additional variables)

| Variable | Source in CI | Used By | Status |
|---|---|---|---|
| All above | **NONE — `.env` file required on server** | Everything | ❌ NOT injected by CI |
| `AZURE_TENANT_ID` | Not in CI | `microsoft-auth.service.ts` line 33 | ❌ NOT set anywhere |
| `AZURE_CLIENT_ID` | Not in CI | `microsoft-auth.service.ts` line 34 | ❌ NOT set anywhere |
| `AZURE_CLIENT_SECRET` | Not in CI | `microsoft-auth.service.ts` line 35 | ❌ NOT set anywhere |
| `AZURE_REDIRECT_URI` | Not in CI | `microsoft-auth.service.ts` line 36 (defaults to `http://localhost:3000/auth/callback`) | ❌ NOT set anywhere |
| `AZURE_ALLOWED_DOMAINS` | Not in CI | `microsoft-auth.service.ts` line 38 | ❌ NOT set anywhere |
| `DB_SSL` | Not in CI | `app.module.ts` TypeORM SSL config | ❌ NOT set anywhere |
| `NEXT_PUBLIC_API_URL` | GitHub Secret | Frontend API base URL baked in at build | ⚠️ Depends on secret being set |

---

## Section 5: Backend CORS Configuration

### File: `rrf-portal-backend/src/main.ts` — Identical in both branches

```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000'];  // ← fallback

app.enableCors({
  origin: allowedOrigins,
  credentials: true,
});
```

**CORS behavior when `ALLOWED_ORIGINS` is undefined:**

The backend allows ONLY `http://localhost:3000`. In production, the frontend is served from something like `http://13.126.110.36:3000` or a domain. The browser sends `Origin: http://13.126.110.36:3000` with every cross-origin request. The backend responds with no `Access-Control-Allow-Origin` header (because the origin doesn't match). The browser blocks the response and the JavaScript sees a network error.

**In devops:** `ALLOWED_ORIGINS` is always set via PM2 ecosystem from `${{ secrets.ALLOWED_ORIGINS }}`. CORS is configured correctly.

**In dev:** `ALLOWED_ORIGINS` depends on `.env` file existing on the server. If `.env` is missing, CORS falls back to `localhost:3000` only → **all cross-origin requests from the deployed frontend are blocked** → "CORS errors appear in the browser."

---

## Section 6: Backend Module Configuration Difference

### File: `rrf-portal-backend/src/app.module.ts`

#### devops branch

```typescript
import { typeOrmConfig } from './config/typeorm.config';

TypeOrmModule.forRoot(typeOrmConfig)
```

Uses the static `typeOrmConfig` object imported from `src/config/typeorm.config.ts`. That file reads `process.env.DB_*` at module load time (synchronously, once at startup). Since devops delivers env vars via PM2 ecosystem before process start, this works.

#### dev branch

```typescript
import { ConfigService } from '@nestjs/config';

TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get<string>('DB_HOST'),
    port: parseInt(config.get<string>('DB_PORT') || '5432'),
    username: config.get<string>('DB_USERNAME'),
    password: config.get<string>('DB_PASSWORD'),
    database: config.get<string>('DB_DATABASE'),
    ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
    // ...
  }),
})
```

Uses `TypeOrmModule.forRootAsync` with `ConfigService`. This is actually the **correct approach** for NestJS — it integrates with the ConfigModule properly. However, it still reads from environment variables, and if those are missing (because no `.env` and no CI-injected env), all DB_* values are `undefined`. TypeORM will attempt to connect to `undefined:undefined/undefined` and fail.

Additionally, dev adds `ssl` support (controlled by `DB_SSL` env var) — this is not present in devops.

---

## Section 7: Authentication Module Difference

### File: `rrf-portal-backend/src/auth/auth.module.ts`

#### devops branch — Registered controllers and providers

```typescript
controllers: [AuthController],
providers: [AuthService, LocalStrategy, JwtStrategy],
```

Simple. Only standard username/password auth.

#### dev branch — Registered controllers and providers

```typescript
import { MicrosoftAuthController } from './microsoft-auth.controller';
import { MicrosoftAuthService } from './microsoft-auth.service';

controllers: [AuthController, MicrosoftAuthController],
providers: [AuthService, MicrosoftAuthService, LocalStrategy, JwtStrategy],
```

`MicrosoftAuthService` is instantiated at startup. Its constructor reads:

```typescript
// src/auth/microsoft-auth.service.ts — lines 30-42
this.tenantId    = this.configService.get<string>('AZURE_TENANT_ID', '');
this.clientId    = this.configService.get<string>('AZURE_CLIENT_ID', '');
this.clientSecret = this.configService.get<string>('AZURE_CLIENT_SECRET', '');
this.redirectUri = this.configService.get<string>('AZURE_REDIRECT_URI', 'http://localhost:3000/auth/callback');

// Also creates a jwksClient connecting to Microsoft's JWKS endpoint:
this.jwksClient = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${this.tenantId}/discovery/v2.0/keys`,
  ...
});
```

**At startup (with no AZURE_TENANT_ID set):** `this.tenantId = ''`. The `jwksClient` is initialized with URI `https://login.microsoftonline.com//discovery/v2.0/keys` (empty tenant ID). This **does not crash the backend at startup** because `jwks-rsa` is lazy about network calls.

**At runtime, when `/auth/microsoft` is called:**

```typescript
// microsoft-auth.service.ts — getAuthUrl()
if (!this.tenantId || !this.clientId) {
  throw new UnauthorizedException('Microsoft login is not configured.');
}
```

This returns a 401. The frontend receives `401 Unauthorized` from `/auth/microsoft`, and the MS login button fails. This is why "Microsoft login (OAuth) also fails."

**Critical impact — `AZURE_REDIRECT_URI` default:** If `AZURE_REDIRECT_URI` is not set, it defaults to `http://localhost:3000/auth/callback`. Even if `AZURE_TENANT_ID` and `AZURE_CLIENT_ID` ARE set correctly, Microsoft would redirect the OAuth flow to `http://localhost:3000/auth/callback` on the user's local machine — not to the production server's callback URL. This would break the OAuth flow completely.

---

## Section 8: New Backend Dependencies in dev Branch

### File: `rrf-portal-backend/package.json`

The following packages exist in `dev` but **not** in `devops`:

| Package | Purpose |
|---|---|
| `jwks-rsa: ^4.0.1` | Microsoft JWKS token validation (used in `microsoft-auth.service.ts`) |
| `jsonwebtoken: ^9.0.3` | Raw JWT signing/verification for state token in MS OAuth |
| `@types/jsonwebtoken: ^9.0.10` | TypeScript types for above |

Since the `dev` backend CI runs `npm install` (not `npm ci`), it should install these packages on the CI runner. However, they must exist in `package.json` and be installable. These packages are present and will install correctly.

The risk here is not the install itself, but that **these packages are wired into `MicrosoftAuthService` which depends on Azure env vars that are never set in production CI/CD.**

---

## Section 9: Hardcoded URL Audit

### Complete list of hardcoded `http://localhost:4000` references

| Branch | File | Line | Context | Impact |
|---|---|---|---|---|
| **both** | `rrf-portal-nextjs/app/login/page.jsx` | devops ~31 / dev ~277 | `handleLogin` — normal username/password login | **HIGH** — All normal logins fail in browser pointing to localhost |
| **dev only** | `rrf-portal-nextjs/app/login/page.jsx` | ~250 | `handleMicrosoftLogin` fallback only (`|| 'http://localhost:4000'`) | MEDIUM — fallback only, but triggered when secret is empty |
| **dev only** | `rrf-portal-nextjs/app/auth/callback/page.jsx` | ~40 | MS OAuth callback fallback (`|| 'http://localhost:4000'`) | MEDIUM — fallback only |
| **both** | `rrf-portal-nextjs/lib/api/apiConfig.js` | ~7, ~42 | All API calls fallback | MEDIUM — fallback; only triggers when `NEXT_PUBLIC_API_URL` is empty |

**Note on `docker-compose.dev.yml` (dev branch only):**

```yaml
environment:
  - NEXT_PUBLIC_API_URL=http://localhost:4000    # ← intentional for local Docker
  - ALLOWED_ORIGINS=http://localhost:3000        # ← intentional for local Docker
```

This file is for local Docker development only and is NOT used in CI/CD. It is correctly scoped. However, its existence explains why dev branch works in local Docker but not on EC2.

---

## Section 10: Behavior Analysis — Why devops Works But dev Fails

### Why devops works

1. `NEXT_PUBLIC_API_URL` is hardcoded as `"http://13.126.110.36:4000/api"` in the workflow YAML — always present at build time, always baked into the JS bundle.
2. The backend PM2 ecosystem file writes all env vars (including `ALLOWED_ORIGINS`) at deploy time from GitHub Secrets — backend always starts with correct configuration.
3. No Microsoft login → no dependency on `AZURE_*` env vars → no new potential failure modes.
4. CORS is correctly configured because `ALLOWED_ORIGINS` is always set.
5. Database connects because `DB_*` vars are always delivered via PM2 ecosystem.
6. JWT works because `JWT_SECRET` is always present (and `getOrThrow` would throw at startup otherwise).

### Why dev fails

1. `NEXT_PUBLIC_API_URL` is read from GitHub Secret `secrets.NEXT_PUBLIC_API_URL`. If this secret is not defined, the value is `""` (empty string) at build time → Next.js bakes `""` into the bundle → `"" || 'http://localhost:4000'` resolves to localhost → **all API calls go to the user's local machine**.

2. The backend CI does NOT pass any env vars to the PM2 process. The server is expected to have a `.env` file already. The `.env` file is excluded from rsync (`--exclude='.env'`). If the `.env` file was never manually created on the server:
   - `ALLOWED_ORIGINS` is `undefined` → CORS allows only `localhost:3000` → **CORS errors on all API calls from the production frontend**
   - `JWT_SECRET` is `undefined` → `configService.getOrThrow('JWT_SECRET')` throws → **backend crashes at startup** → **502 Bad Gateway on all routes**
   - `DB_*` vars are `undefined` → TypeORM connection fails → **backend crashes or all DB queries fail** → **502 Bad Gateway**

3. Microsoft login adds `AZURE_*` env vars that are **never configured in CI/CD or in GitHub Secrets**. Even if the `.env` file exists with DB and JWT vars, it would be missing Azure vars → `/auth/microsoft` returns 401 → **MS login fails**.

4. The normal login handler has `fetch('http://localhost:4000/auth/login', {...})` hardcoded — bypassing `apiConfig.js` and `NEXT_PUBLIC_API_URL` entirely. This sends the login request to `http://localhost:4000` in the browser → the **user's local machine** → "Failed to fetch" / connection refused → **normal login fails**.

---

## Section 11: Root Causes — Ranked by Impact

### Root Cause #1 (CRITICAL): Backend receives zero environment variables in dev CI/CD

**File:** `.github/workflows/backend-deploy-dev.yml`

**Explanation:** The dev backend deploy SSH command uses `<< 'EOF'` (single-quoted heredoc), which means **no shell variable expansion happens**. More importantly, no `env:` block is defined in the deploy step at all. The PM2 process is started with `pm2 start dist/src/main.js --name rrf-portal-backend` — no ecosystem file, no `--env`, no env injection. The `.env` file is excluded from rsync. The backend therefore starts with all env vars as `undefined`.

**Immediate consequences:**
- `JWT_SECRET` is undefined → `configService.getOrThrow('JWT_SECRET')` throws → backend crashes or auth fails entirely
- `ALLOWED_ORIGINS` is undefined → CORS only allows `http://localhost:3000` → all cross-origin API calls blocked
- `DB_*` vars are undefined → database connection fails → all DB-dependent routes return 500/502

**Why devops doesn't have this:** devops writes a `ecosystem.config.js` during the SSH step and passes all GitHub Secrets into PM2 env. The backend always starts with all required vars.

---

### Root Cause #2 (CRITICAL): `NEXT_PUBLIC_API_URL` GitHub Secret may be missing or empty

**File:** `.github/workflows/frontend-deploy-dev.yml`

**Explanation:** `NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}` resolves to empty string if the GitHub Secret is not set. Next.js bakes this value at build time. An empty string causes the fallback `|| 'http://localhost:4000'` to activate, permanently embedding `localhost:4000` in the production JS bundle.

**Why devops doesn't have this:** The URL is a hardcoded literal string in the YAML, not a secret reference.

---

### Root Cause #3 (HIGH): Normal login handler hardcodes `http://localhost:4000`

**File:** `rrf-portal-nextjs/app/login/page.jsx` (line ~277 in dev)

**Explanation:** `handleLogin` directly calls `fetch('http://localhost:4000/auth/login', ...)`. This bypasses `apiConfig.js` and `NEXT_PUBLIC_API_URL` completely. Even if root cause #2 were fixed and the API URL were correctly set in the bundle, the login fetch would still go to localhost.

**Note:** This bug also exists in devops (line ~31) but may be masked there if the backend and frontend are on the same server (the browser being tested from a terminal/proxy context).

---

### Root Cause #4 (HIGH): Microsoft login requires Azure env vars — none are set in CI/CD

**Files:** `rrf-portal-backend/src/auth/microsoft-auth.service.ts`, `.github/workflows/backend-deploy-dev.yml`

**Explanation:** `MicrosoftAuthService` requires `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_REDIRECT_URI`. None of these are passed in the dev backend deploy workflow. If they're missing, `/auth/microsoft` returns 401. If `AZURE_REDIRECT_URI` is missing, it defaults to `http://localhost:3000/auth/callback` — meaning even if the Azure app registration were correct, Microsoft would redirect to localhost, not production.

---

### Root Cause #5 (MEDIUM): `app.module.ts` TypeORM migration — forRoot vs forRootAsync

**File:** `rrf-portal-backend/src/app.module.ts`

**Explanation:** The dev branch switched from `TypeOrmModule.forRoot(typeOrmConfig)` to `TypeOrmModule.forRootAsync({ useFactory: (config) => ({...}) })`. The new version is architecturally better (lazy env resolution via ConfigService) but adds a new `DB_SSL` env var check that wasn't present before. More importantly, this change adds `retryAttempts: 10, retryDelay: 3000` which is the same as in `typeOrmConfig`, so resilience is maintained. This is NOT a root cause of failure by itself, but it means DB config is now entirely runtime-dependent on env vars.

---

## Section 12: Summary Table — All Differences That Cause Failures

| # | File | devops | dev | Failure Caused |
|---|---|---|---|---|
| 1 | `backend-deploy-dev.yml` | PM2 ecosystem with all secrets baked in | Raw `pm2 start`, no env delivery, `.env` expected manually | CORS errors, 502, auth failures, DB failures |
| 2 | `frontend-deploy-dev.yml` | `NEXT_PUBLIC_API_URL` hardcoded as literal IP | `NEXT_PUBLIC_API_URL` from GitHub Secret (may be empty) | All API calls fall back to `localhost:4000` |
| 3 | `app/login/page.jsx` | Hardcoded `localhost:4000` for login (latent bug) | Same hardcoded `localhost:4000` for login **+ MS login** | Normal login fails in browser |
| 4 | `auth/auth.module.ts` | No MS auth | `MicrosoftAuthController` + `MicrosoftAuthService` registered | MS login returns 401, no Azure vars configured |
| 5 | `microsoft-auth.service.ts` | Does not exist | `AZURE_*` vars read at construction, `localhost:3000` default redirect | MS OAuth flow broken even if backend starts |
| 6 | `app.module.ts` | `forRoot(typeOrmConfig)` — static | `forRootAsync` + new `DB_SSL` var | Additional env var surface area |
| 7 | `backend/package.json` | No `jwks-rsa`, no `jsonwebtoken` | Added `jwks-rsa`, `jsonwebtoken` | Not a failure cause — packages install correctly |

---

## Section 13: Most Likely Root Cause (Single Sentence)

> **The dev branch backend CI/CD never delivers environment variables to the server — no PM2 ecosystem file, no `--env` flags, no GitHub Secrets injection — so the NestJS backend starts with every env var as `undefined`, causing `JWT_SECRET` to throw at startup, CORS to lock down to `localhost:3000`, and the database to fail to connect; simultaneously, the frontend build may embed `localhost:4000` permanently if the `NEXT_PUBLIC_API_URL` GitHub Secret is not set, and the normal login handler hardcodes `localhost:4000` unconditionally regardless of any env var.**

---

## Appendix: Files Analyzed

| File | Branch | Method |
|---|---|---|
| `.github/workflows/backend-deploy-dev.yml` | both | `git show` |
| `.github/workflows/frontend-deploy-dev.yml` | both | `git show` |
| `rrf-portal-nextjs/lib/api/apiConfig.js` | both | `git show` / `git diff` |
| `rrf-portal-nextjs/app/login/page.jsx` | both | `git show` + `Select-String` |
| `rrf-portal-nextjs/app/auth/callback/page.jsx` | dev | `git show` |
| `rrf-portal-backend/src/main.ts` | both | `git show` |
| `rrf-portal-backend/src/app.module.ts` | both | `git show` |
| `rrf-portal-backend/src/auth/auth.module.ts` | both | `git show` |
| `rrf-portal-backend/src/auth/microsoft-auth.controller.ts` | dev | `git show` |
| `rrf-portal-backend/src/auth/microsoft-auth.service.ts` | dev | `git show` |
| `rrf-portal-backend/src/config/typeorm.config.ts` | both | `git show` |
| `rrf-portal-backend/.env.example` | dev | `git show` |
| `rrf-portal-backend/package.json` | both | `git show` + `Select-String` |
| `rrf-portal-nextjs/next.config.js` | both | `git show` |
| `rrf-portal-nextjs/contexts/AuthContext.jsx` | both | `git show` |
| `docker-compose.dev.yml` | dev | `git show` |
| `rrf-portal-nextjs/app/api/auth/login/route.js` | both | `git show` |
| `rrf-portal-nextjs/app/api/auth/verify/route.js` | both | `git show` |
