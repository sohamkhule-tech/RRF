# TypeORM Migration System - Quick Reference

## ✅ What Was Set Up

1. **data-source.ts** - TypeORM CLI configuration for migrations
2. **src/migrations/** - Directory for all migration files
3. **backups/** - Directory for database backups before migrations
4. **Dependencies installed**: dotenv, ts-node

---

## 🔧 Manual Configuration Required

### 1. Update package.json

Add these scripts in the "scripts" section:

```json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs",
    "migration:generate": "npm run typeorm -- migration:generate -d data-source.ts",
    "migration:create": "npm run typeorm -- migration:create",
    "migration:run": "npm run typeorm -- migration:run -d data-source.ts",
    "migration:revert": "npm run typeorm -- migration:revert -d data-source.ts",
    "migration:show": "npm run typeorm -- migration:show -d data-source.ts"
  }
}
```

### 2. Update src/config/typeorm.config.ts

Replace:
```typescript
synchronize: process.env.NODE_ENV !== 'production',
```

With:
```typescript
synchronize: false,  // ⚠️ NEVER use true in production
migrationsRun: true,  // Auto-run migrations on startup
migrations: [__dirname + '/../migrations/*{.ts,.js}'],
migrationsTableName: 'typeorm_migrations',
```

---

## 🚀 First-Time Migration Setup

After completing manual configuration:

```bash
# 1. Generate initial migration from existing database
docker exec -it rrf-backend-dev npm run migration:generate -- src/migrations/InitialSchema

# 2. Run the migration
docker exec -it rrf-backend-dev npm run migration:run

# 3. Verify it worked
docker exec -it rrf-backend-dev npm run migration:show

# 4. Restart backend
docker-compose -f docker-compose.dev.yml restart backend
```

---

## 📝 Common Migration Commands

### Generate Migration (auto-detect changes)
```bash
docker exec -it rrf-backend-dev npm run migration:generate -- src/migrations/MigrationName
```

### Create Empty Migration (for custom SQL)
```bash
docker exec -it rrf-backend-dev npm run migration:create -- src/migrations/MigrationName
```

### Run Pending Migrations
```bash
docker exec -it rrf-backend-dev npm run migration:run
```

### Rollback Last Migration
```bash
docker exec -it rrf-backend-dev npm run migration:revert
```

### Show Migration Status
```bash
docker exec -it rrf-backend-dev npm run migration:show
```

---

## 💡 Example Workflow

### Adding a New Column

**1. Update your entity:**
```typescript
// src/users/user.entity.ts
@Column({ nullable: true })
phoneNumber: string;
```

**2. Generate migration:**
```bash
docker exec -it rrf-backend-dev npm run migration:generate -- src/migrations/AddPhoneNumber
```

**3. Review the file in src/migrations/**

**4. Apply migration:**
```bash
docker exec -it rrf-backend-dev npm run migration:run
```

**5. If something went wrong:**
```bash
docker exec -it rrf-backend-dev npm run migration:revert
```

---

## 🔒 Safety Features

✅ **Migrations run in transactions** - Auto-rollback on errors
✅ **migrationsRun: true** - Runs automatically on app startup
✅ **synchronize: false** - No more accidental data loss
✅ **Migration history tracked** - In typeorm_migrations table

---

## 📚 Documentation

See **MIGRATION_GUIDE.md** for comprehensive documentation including:
- Detailed setup instructions
- Migration best practices
- Docker integration
- Troubleshooting guide
- Production deployment strategies

---

**Status:** Setup complete - Ready for manual configuration
**Date:** April 21, 2026
