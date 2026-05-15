# RRF Portal

Resource Requisition Form (RRF) Portal — a full-stack monorepo for managing internal hiring requests.

| Layer | Technology | Port |
|---|---|---|
| Frontend | Next.js 14, Ant Design 5, Tailwind CSS | 3000 |
| Backend | NestJS 10, TypeORM 0.3, PostgreSQL 15 | 4000 |
| Database | PostgreSQL 15 (Docker) | 5432 |

---

## Project Structure

```
RRF_2/
├── rrf-portal-backend/     # NestJS REST API
├── rrf-portal-nextjs/      # Next.js frontend
├── docker-compose.yml      # Production stack (builds images)
├── docker-compose.dev.yml  # Development stack (hot reload volumes)
└── README.md
```

---

## 1. Frontend Setup

```bash
cd rrf-portal-nextjs
npm install
```

Create `rrf-portal-nextjs/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Start dev server:

```bash
npm run dev
```

The frontend is available at `http://localhost:3000`.

---

## 2. Backend Setup

```bash
cd rrf-portal-backend
npm install
```

Create `rrf-portal-backend/.env` by copying the example:

```bash
cp .env.example .env
```

Edit `.env` and fill in your local database credentials (see [Environment Variables](#5-environment-variables)).

Start dev server (TypeScript, hot reload):

```bash
npm run start:dev
```

The API is available at `http://localhost:4000`.

---

## 3. Docker Setup

### Production stack

Builds both backend and frontend images from source and starts all services:

```bash
docker-compose up --build
```

Services started:
- `rrf-postgres` — PostgreSQL 15 on port 5432
- `rrf-backend` — NestJS API on port 4000
- `rrf-frontend` — Next.js on port 3000

### Development stack (hot reload)

Mounts source volumes so code changes reflect without rebuilding:

```bash
docker-compose -f docker-compose.dev.yml up
```

> The dev compose reuses the same `postgres_data` volume as production, so your database is preserved when switching between modes.

### Stop all services

```bash
docker-compose down
```

Add `-v` to also remove the database volume:

```bash
docker-compose down -v
```

---

## 4. Environment Variables

### Backend (`rrf-portal-backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `DB_DATABASE` | Database name | `rrf_portal_clean` |
| `JWT_SECRET` | Secret key for JWT signing | `change_me_in_production` |
| `JWT_EXPIRES_IN` | JWT token lifetime | `24h` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `http://localhost:3000` |
| `PORT` | API listen port | `4000` |
| `NODE_ENV` | Runtime environment | `development` or `production` |

> In Docker, environment variables are injected directly via `docker-compose.yml`. A `.env` file is not required inside the container.

### Frontend (`rrf-portal-nextjs/.env.local`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (used by browser) | `http://localhost:4000` |

---

## 5. Database Migration Workflow

Migrations are generated from TypeScript source and executed from compiled JavaScript. The two environments are strictly separated.

### Local Development — generate a new migration

After changing or adding entity files, generate a migration:

```bash
cd rrf-portal-backend
npm run migration:generate -- src/database/migrations/DescriptiveName
```

This uses `ts-node` to diff the current entity schema against the database and writes a new `.ts` migration file into `src/database/migrations/`.

**Commit the generated migration file to version control.**

---

### Server / Production — run pending migrations

> **Never run `migration:generate` on a server.** Servers only execute migrations that were already generated locally and committed.

Before running migrations on a server, build the project first:

```bash
npm run build
```

This compiles all TypeScript (including migrations) into `dist/`. TypeORM then runs migrations from `dist/data-source.js`.

Check which migrations are pending:

```bash
npm run migration:show:dist
```

Apply all pending migrations:

```bash
npm run migration:run:dist
```

---

### How it works internally

| Step | Command | Datasource used |
|---|---|---|
| Generate | `migration:generate` | `data-source.ts` (ts-node, reads `src/`) |
| Build | `npm run build` | compiles `src/` → `dist/` |
| Show | `migration:show:dist` | `dist/data-source.js` (reads `dist/src/database/migrations/`) |
| Run | `migration:run:dist` | `dist/data-source.js` |

Migration files live in `src/database/migrations/` and compile to `dist/src/database/migrations/` on build.

---

## 6. Production Deployment Workflow

Typical deployment sequence on a fresh server or after a code push:

```bash
# 1. Install dependencies
npm install --production

# 2. Build compiled output
npm run build

# 3. Check pending migrations (safe, read-only)
npm run migration:show:dist

# 4. Apply pending migrations
npm run migration:run:dist

# 5. Start the production server
npm run start:prod
```

For containerized deployments, steps 3–5 are handled inside the container. The Dockerfile runs `npm run build` at image build time; migrations and startup happen at container start.

---

## Available Scripts

### Backend (`rrf-portal-backend/`)

| Script | Description |
|---|---|
| `npm run start:dev` | Start with hot reload (ts-node) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run start:prod` | Start compiled production server |
| `npm run migration:generate -- src/database/migrations/Name` | Generate a new migration from entity diff |
| `npm run migration:show:dist` | List applied and pending migrations (dist) |
| `npm run migration:run:dist` | Apply all pending migrations (dist) |
| `npm run db:seed` | Seed initial roles, permissions, and admin user |

### Frontend (`rrf-portal-nextjs/`)

| Script | Description |
|---|---|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Build production Next.js output |
| `npm run start` | Start production server |
