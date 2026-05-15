import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load .env from the working directory (wherever npm scripts are invoked from).
// Using process.cwd() is stable for both TS (ts-node) and compiled dist runtimes
// because __dirname shifts from project-root to project-root/dist after build.
config({ path: path.resolve(process.cwd(), '.env') });

// Detect whether executing from compiled JS (dist/) or directly from source (ts-node).
// __filename ends with '.ts' under ts-node, '.js' after tsc compilation.
const isCompiled = __filename.endsWith('.js');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,

  // TS runtime  (__dirname = rrf-portal-backend/)        → src/**/*.entity.ts
  // dist runtime (__dirname = rrf-portal-backend/dist/)  → src/**/*.entity.js
  // (NestJS CLI preserves the src/ prefix in dist output)
  entities: [
    path.join(__dirname, isCompiled ? 'src/**/*.entity.js' : 'src/**/*.entity.ts'),
  ],

  // TS runtime  → src/database/migrations/*.ts   (generation target)
  // dist runtime → src/database/migrations/*.js  (run/revert/show target)
  migrations: [
    path.join(
      __dirname,
      isCompiled ? 'src/database/migrations/*.js' : 'src/database/migrations/*.ts',
    ),
  ],

  // SSL — mirrors AppModule's runtime TypeORM config.
  // Set DB_SSL=true in .env (or environment) for AWS RDS / staging / production.
  // Leave unset or DB_SSL=false for local Docker / local Postgres.
  ssl:
    process.env.DB_SSL === 'true'
      ? {
          rejectUnauthorized: false,
        }
      : false,

  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: ['query', 'error', 'warn', 'migration'],
  poolSize: 10,
  connectTimeoutMS: 10000,
});

export default AppDataSource;