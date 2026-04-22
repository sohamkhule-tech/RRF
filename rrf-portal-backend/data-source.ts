import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load .env from the monorepo root (one level up from rrf-portal-backend/)
// This works both locally and in CI where no .env exists (env vars come from secrets)
config({ path: path.resolve(__dirname, '../.env') });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: ['query', 'error', 'warn', 'migration'],
  poolSize: 10,
  connectTimeoutMS: 10000,
});

export default AppDataSource;