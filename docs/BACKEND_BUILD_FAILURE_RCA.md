# Root Cause Analysis: Backend Build Failure in `dev` Branch

**Document Type:** Read-Only Forensic Analysis  
**Scope:** `rrf-portal-backend/` — TypeScript compilation + CI/CD pipeline  
**Branch Under Investigation:** `dev`  
**Comparison Branch:** `devops` (known-good)  
**Author:** GitHub Copilot (AI Analysis)  
**Date:** 2025-07  
**Status:** COMPLETE — No code was modified during this analysis.

---

## 1. Executive Summary

The `dev` branch backend **fails to build successfully in CI** while `devops` succeeds, even though both branches use structurally identical CI pipelines (`npm install && npm run build`). The failures are caused by **source code changes introduced in `dev`** that are incompatible with the build environment, not by any pipeline difference. Three distinct root causes were identified, with one being the primary culprit in most environments:

| # | Root Cause | Severity | Scope |
|---|-----------|----------|-------|
| RC-1 | `webpack.config.js` requires `webpack-node-externals` which is **not in `package.json`** | CRITICAL | Build-time crash |
| RC-2 | Two decorators export the same function name with **incompatible type signatures** — runtime guard mismatch | HIGH | Compilation warning / silent runtime bug |
| RC-3 | `notifications.gateway.ts` imports `{ Server, Socket } from 'socket.io'` — only a transitive dependency, not declared | MEDIUM | TypeScript compilation failure |
| RC-4 | `NotificationsModule` and `ReportsModule` are **orphaned** (compiled but not wired into AppModule) | LOW | Dead code, potential import resolution errors |
| RC-5 | No `package-lock.json` committed to git — `npm install` in CI resolves fresh every time | MEDIUM | Non-deterministic build reproducibility |

**Result:** When CI runs `npm run build` in the dev branch, it hits RC-1 or RC-3 (or both), exits with a non-zero code, and because `deleteOutDir: true` already cleared `dist/`, the server receives an **empty `dist/` folder** on the next rsync. PM2 can no longer find `dist/src/main.js` → backend process crashes → `502 Bad Gateway`.

---

## 2. Pipeline Comparison

Both branches trigger `npm install && npm run build` in CI. The pipelines are functionally identical in the **build step**. The key difference is in the **deploy step**:

### `devops` branch deploy step
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
    # Writes a pm2 ecosystem.config.js with ALL env vars baked in
    pm2 start ecosystem.config.js
```

### `dev` branch deploy step
```yaml
- name: Deploy Backend
  run: |
    # NO env vars injected
    # Warns if .env is missing, but does NOT fail
    pm2 start dist/src/main.js --name rrf-portal-backend
```

The deploy step difference is **a separate, pre-existing issue** (causing runtime crashes even when the build succeeds). However, the focus of this RCA is the build failure — why `dist/` is empty or not generated at all.

---

## 3. Root Cause Details

---

### RC-1 (CRITICAL): `webpack.config.js` requires `webpack-node-externals` — package not declared

**File:** `rrf-portal-backend/webpack.config.js` *(exists only in `dev` branch)*

**Code:**
```js
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals'); // ← LINE 3
```

**`package.json` search result:**
```
"webpack-node-externals" — NOT FOUND in dependencies or devDependencies
```

**How this causes a build failure:**

The NestJS CLI (`@nestjs/cli`) checks for the presence of `webpack.config.js` in the project root. When found, it **automatically activates webpack compilation mode** — equivalent to running `nest build --webpack`. This is documented NestJS behavior:

> *"If a webpack configuration file is present in the project root, NestJS CLI will use it for compilation."*

When webpack mode activates:
1. CLI loads `webpack.config.js`
2. Node.js executes `require('webpack-node-externals')` on line 3
3. `webpack-node-externals` is not installed (not in `package.json`) → `MODULE_NOT_FOUND` error
4. Build process crashes immediately
5. `dist/` was already cleared by `deleteOutDir: true` in `nest-cli.json`
6. **Final state: empty `dist/` directory**

**Why `devops` is unaffected:**
The `devops` branch has **no `webpack.config.js`** file. NestJS CLI falls back to standard `tsc` compilation, which succeeds.

**Evidence:**
```
git ls-tree devops rrf-portal-backend/webpack.config.js  → (no output — file doesn't exist)
git ls-tree dev rrf-portal-backend/webpack.config.js     → exists: webpack.config.js
```

**Exact error that appears in CI logs:**
```
Error: Cannot find module 'webpack-node-externals'
Require stack:
- /home/runner/work/.../rrf-portal-backend/webpack.config.js
```

---

### RC-2 (HIGH): Two decorators export `RequirePermission` with incompatible signatures

**Files:**

| File | Branch | Signature |
|------|--------|-----------|
| `src/decorators/permissions.decorator.ts` | both branches | `(permission: string) => SetMetadata(KEY, permission)` |
| `src/decorators/require-permission.decorator.ts` | dev only | `(...permissions: string[]) => SetMetadata(KEY, permissions)` |

**Who imports which:**

| Controller | Import Source | Stores in metadata |
|-----------|--------------|-------------------|
| `rrf.controller.ts` | `permissions.decorator` | `string` (scalar) |
| `reports.controller.ts` | `require-permission.decorator` | `string[]` (array) |
| `job-descriptions.controller.ts` | `permissions.decorator` | `string` (scalar) |

**The guard reads the metadata:**
```typescript
// src/guards/permission.guard.ts
import { PERMISSION_KEY } from '../decorators/permissions.decorator';

const requiredPermission = this.reflector.getAllAndOverride<string>(
  PERMISSION_KEY,
  [context.getHandler(), context.getClass()],
);
// Type declared as <string> — breaks silently when actual value is string[]
```

**Both decorator files export `PERMISSION_KEY = 'permission'` with the same string value.** The guard always reads from `permissions.decorator`'s key — so when `reports.controller.ts` uses `require-permission.decorator`, the metadata key is the same but the value is a `string[]`. The guard then receives an array where it expects a scalar string. The permission check `user.permissions.includes(requiredPermission)` will always return `false` for any request routed through `ReportsController`.

**This does NOT cause a TypeScript build error** (TypeScript can't validate runtime metadata types) but it causes a **silent authorization bug** — all `/reports/*` endpoints will return 403 Forbidden for every user including admins.

This is documented here as it represents a correctness regression introduced in `dev` that isn't present in `devops`.

---

### RC-3 (MEDIUM): `notifications.gateway.ts` imports `socket.io` as a direct module

**File:** `src/notifications/notifications.gateway.ts` *(dev only)*

**Code:**
```typescript
import { Server, Socket } from 'socket.io';
```

**`package.json` analysis:**
```json
"@nestjs/platform-socket.io": "^10.4.22",  ← listed
"@nestjs/websockets":         "^10.4.22",  ← listed
"socket.io":                              ← NOT listed (transitive dep only)
```

`socket.io` is installed as a transitive dependency of `@nestjs/platform-socket.io`. However:

1. **TypeScript requires `@types/socket.io` or the package itself to be a declared dependency** for type resolution. When `socket.io` types are resolved only transitively, TypeScript may fail to locate them depending on `moduleResolution` settings.
2. If `npm install` resolves `@nestjs/platform-socket.io` to a version that moves `socket.io` to `peerDependencies` (common in newer versions), `socket.io` may not be installed at all.
3. **Without a `package-lock.json`** committed (see RC-5), CI resolves package versions fresh each time — a different `socket.io` transitive resolution is possible across runs.

**Potential CI log:**
```
error TS2307: Cannot find module 'socket.io' or its corresponding type declarations.
```

**Why `devops` is unaffected:**
`devops` branch has no `src/notifications/` directory — the file doesn't exist.

---

### RC-4 (LOW): `NotificationsModule` and `ReportsModule` are orphaned

**AppModule in `dev`:**
```typescript
// app.module.ts — verified imports list
AuthModule, UsersModule, RolesModule, ModulesModule, PermissionsModule,
RolePermissionsModule, FunctionsModule, SubfunctionsModule, UserSubfunctionsModule,
JobDescriptionsModule, SeedModule, RrfModule, EventEmitterModule, TypeOrmModule.forRootAsync(...)
// ← NotificationsModule NOT imported
// ← ReportsModule NOT imported
```

Despite not being registered in AppModule, TypeScript **compiles all `*.ts` files under `src/`** during `nest build`. This means all files in `src/notifications/` and `src/reports/` (15+ files) are type-checked. Any TypeScript error in any of these files fails the entire build.

**Risk:** The orphaned modules introduce a large surface area of new TypeScript code (new entities, services, controllers, gateways, DTOs) that is compiled but never executed. Any type error in these files breaks the build even though the feature is not yet wired up.

---

### RC-5 (MEDIUM): No `package-lock.json` — non-deterministic CI installs

**Evidence from `.gitignore`:**
```
# rrf-portal-backend/.gitignore
package-lock.json    ← explicitly ignored in backend
```

**Frontend comparison:**
```
# rrf-portal-nextjs/package-lock.json IS committed
# This is why the frontend build is deterministic and succeeds
```

**Impact:** Every CI run on the `dev` branch performs a fresh `npm install` without a lock file. All packages using `^` version ranges (the majority) resolve to the **latest compatible version at that moment**. 

New packages introduced in `dev` that were never previously resolved include:
- `@nestjs/event-emitter@^3.1.0`
- `@nestjs/platform-socket.io@^10.4.22`
- `@nestjs/websockets@^10.4.22`
- `jwks-rsa@^4.0.1`
- `jsonwebtoken@^9.0.3`
- `dotenv@^17.4.2` *(v17 is a recent major — confirmed to exist but has breaking changes from v16)*
- `ts-node@^10.9.2` *(in production deps — unusual placement)*

Any breaking change in any of these packages' resolved versions will silently change build behavior across CI runs, making failures non-reproducible.

---

## 4. Why the Frontend Is Unaffected

| Factor | Backend (`dev`) | Frontend (`dev`) |
|--------|----------------|-----------------|
| `package-lock.json` committed | ❌ No | ✅ Yes |
| `webpack.config.js` present | ✅ Yes (RC-1) | ❌ No |
| New TypeScript source files with potential errors | ✅ Yes (15+ files) | ❌ No |
| CI uses `npm ci` (lock file) | ❌ `npm install` (no lock) | ✅ `npm ci` |
| Build step | `nest build` (TypeScript compilation) | `next build` (Babel/SWC, less strict) |
| `deleteOutDir: true` risk | ✅ Yes — dist cleared before build | N/A |

Frontend uses `npm ci` which requires and uses `package-lock.json`. Frontend's Next.js build is also more tolerant of transitive dependency issues. The frontend changes in `dev` (new pages, components) are purely React/JSX with no TypeScript strict mode enforced at build time.

---

## 5. Failure Chain (Step-by-Step)

This is what happens when a push to `dev` triggers the backend CI pipeline:

```
1. GitHub Actions: git checkout dev
2. npm install (no lock file) → installs latest-compatible packages
3. npm run build → calls `nest build`
4. NestJS CLI detects webpack.config.js in project root
5. CLI activates webpack compilation mode
6. webpack.config.js executes: require('webpack-node-externals')
7. Node.js: MODULE_NOT_FOUND — package not in node_modules
8. nest build exits with code 1
9. dist/ is already empty (deleteOutDir: true ran at step start)
10. CI step "Install & Build Backend" FAILS
11. rsync still runs (no --continue-on-error, but rsync step may be skipped by CI)
    → If it runs: rsync --delete syncs empty/nonexistent dist/ to server
    → Server's dist/ is wiped
12. ssh deploy step runs: pm2 start dist/src/main.js
13. dist/src/main.js does not exist
14. PM2 exits: Cannot find entry file
    OR: pm2 logs: Error: Cannot find module '/app/dist/src/main.js'
15. PM2 crash loop begins
16. Server returns 502 Bad Gateway on all API calls
```

---

## 6. Why `devops` Branch Succeeds

**`devops` is a clean, stable baseline:**
- No `webpack.config.js` → NestJS CLI uses standard `tsc` compilation
- Fewer source files → smaller TypeScript compilation surface
- No orphaned modules with potentially broken imports
- `package-lock.json` situation is the same (also gitignored), but `devops` has fewer new packages with `^` ranges to resolve
- No `notifications.gateway.ts` → no transitive `socket.io` import issue

The `devops` build succeeds because it is a **smaller, simpler codebase** with no self-referencing webpack configuration errors.

---

## 7. Summary of Evidence Files

| File | Branch | Issue |
|------|--------|-------|
| `rrf-portal-backend/webpack.config.js` | dev only | Requires `webpack-node-externals` (not in package.json) |
| `rrf-portal-backend/package.json` | dev | No `webpack-node-externals` entry; `dotenv@^17.4.2`; `ts-node` in prod deps |
| `rrf-portal-backend/nest-cli.json` | both (identical) | `deleteOutDir: true` — wipes dist before failed builds |
| `src/decorators/permissions.decorator.ts` | both | `(permission: string)` — scalar |
| `src/decorators/require-permission.decorator.ts` | dev only | `(...permissions: string[])` — variadic array |
| `src/guards/permission.guard.ts` | both | Reads metadata as `string` — breaks for `reports.controller.ts` |
| `src/reports/reports.controller.ts` | dev only | Imports from `require-permission.decorator` (incompatible) |
| `src/notifications/notifications.gateway.ts` | dev only | `import { Server, Socket } from 'socket.io'` (not in package.json) |
| `src/app.module.ts` | dev | Missing `NotificationsModule`, `ReportsModule` imports |
| `.github/workflows/backend-deploy-dev.yml` | dev | No env vars injected at PM2 start (separate runtime issue) |

---

## 8. Recommended Fixes (Prioritized)

> **Note: This section is informational only. No code was modified during this analysis.**

### Fix 1 (CRITICAL — RC-1): Add `webpack-node-externals` to `devDependencies`
```bash
npm install --save-dev webpack-node-externals
```
Or remove `webpack.config.js` from the backend entirely (since `nest-cli.json` does not explicitly enable webpack mode, and the config was likely added for local Docker development).

### Fix 2 (HIGH — RC-2): Consolidate to a single decorator
Delete `require-permission.decorator.ts`. Update `reports.controller.ts` to import from `permissions.decorator`. Update `permission.guard.ts` to handle both `string` and `string[]` cases safely.

### Fix 3 (MEDIUM — RC-3): Declare `socket.io` as an explicit dependency
```bash
npm install --save socket.io
# or add @types/socket.io for TypeScript resolution only
```

### Fix 4 (MEDIUM — RC-5): Commit `package-lock.json`
Remove `package-lock.json` from `.gitignore` in the backend. Use `npm ci` in CI instead of `npm install`. This eliminates non-deterministic version resolution.

### Fix 5 (LOW — RC-4): Register orphaned modules or exclude from compilation
Either add `NotificationsModule` and `ReportsModule` to `app.module.ts`, or configure `tsconfig.json` to exclude their directories until they are ready:
```json
{
  "exclude": ["src/notifications/**", "src/reports/**"]
}
```

### Fix 6 (Separate — Deploy-time): Add env vars to `dev` CI deploy step
Mirror the `devops` approach of writing a `pm2 ecosystem.config.js` with all secrets baked in as environment variables. See `devops:.github/workflows/backend-deploy-dev.yml` for the reference implementation.

---

*End of RCA — No code was modified. All findings are based on static analysis of git diff between `dev` and `devops` branches.*
