# TypeORM Migration System - Complete Guide

## 🚨 CRITICAL CHANGES

**We have disabled synchronize: true to prevent data loss.**

From now on, **ALL schema changes MUST go through migrations**.

---

## 📁 Project Structure

```
rrf-portal-backend/
├── data-source.ts              # TypeORM CLI configuration
├── backups/                    # Database backups before migrations
├── src/
│   ├── config/
│   │   └── typeorm.config.ts   # Runtime TypeORM config
│   ├── migrations/             # ✅ ALL migrations go here
│   └── ...
└── package.json
```

---

## 🛠️ Setup Instructions

### Step 1: Install Dependencies
```bash
npm install dotenv ts-node --save
```

### Step 2: Update package.json Scripts

Add these scripts to your package.json:
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

---

## 📝 Migration Commands

### Generate Migration (from entity changes)
```bash
npm run migration:generate -- src/migrations/MigrationName
```
**Use when:** You've modified entities and want TypeORM to auto-generate the migration.

### Create Empty Migration
```bash
npm run migration:create -- src/migrations/MigrationName
```
**Use when:** You need to write custom SQL or data transformations.

### Run Migrations
```bash
npm run migration:run
```
**Apply all pending migrations.**

### Revert Last Migration
```bash
npm run migration:revert
```
**Undo the last applied migration.**

### Show Migration Status
```bash
npm run migration:show
```
**See which migrations have been applied.**

---

## 🔄 Workflow Example

### Adding a New Column

**1. Modify your entity:**
```typescript
// src/users/user.entity.ts
@Entity('users')
export class User {
  @Column({ nullable: true })
  phoneNumber: string;  // NEW
}
```

**2. Generate migration:**
```bash
npm run migration:generate -- src/migrations/AddPhoneNumber
```

**3. Review generated file:**
```typescript
// src/migrations/1713795200000-AddPhoneNumber.ts
export class AddPhoneNumber1713795200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      ALTER TABLE "users" ADD "phoneNumber" VARCHAR NULL
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      ALTER TABLE "users" DROP COLUMN "phoneNumber"
    );
  }
}
```

**4. Run migration:**
```bash
npm run migration:run
```

**5. If needed, revert:**
```bash
npm run migration:revert
```

---

## 🐳 Docker Integration

### Run Migrations in Docker
```bash
# Enter container
docker exec -it rrf-backend-dev bash

# Run migrations
npm run migration:run

# Exit
exit
```

### Or run directly:
```bash
docker exec -it rrf-backend-dev npm run migration:run
```

---

## 💾 Auto-Run Migrations on Startup

Your typeorm.config.ts now has:
```typescript
migrationsRun: true,
```

This means migrations run automatically when NestJS starts.

**For production**, consider:
- Set migrationsRun: false
- Run migrations manually before deployment

---

## ⚠️ Important Notes

1. **NEVER use synchronize: true in production**
2. **Always backup before migrations**
3. **Test migrations locally first**
4. **Migrations run in transactions** (auto-rollback on error)
5. **Commit migration files to git**

---

## 🚀 Quick Start Checklist

- [ ] Install dependencies: npm install dotenv ts-node --save
- [ ] Update package.json with migration scripts
- [ ] Update typeorm.config.ts (set synchronize: false)
- [ ] Create initial migration: npm run migration:generate -- src/migrations/InitialSchema
- [ ] Run migration: npm run migration:run
- [ ] Verify: npm run migration:show

---

## 📚 Additional Resources

- TypeORM Migrations: https://typeorm.io/migrations
- NestJS Database: https://docs.nestjs.com/techniques/database

---

**Last Updated:** April 21, 2026
**Status:** Migration system configured and ready
