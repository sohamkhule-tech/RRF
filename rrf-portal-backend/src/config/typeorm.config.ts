import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,

  // ✅ THIS LINE IS THE REAL FIX
  ssl: true,

  extra: {
    ssl: {
      rejectUnauthorized: false,
    },
  },

  entities: [__dirname + '/../**/*.entity{.ts,.js}'],

  synchronize: false,
  logging: false,

  retryAttempts: 10,
  retryDelay: 3000,

  poolSize: 20,
  connectTimeoutMS: 10000,
  maxQueryExecutionTime: 5000,

  cache: {
    type: 'database',
    tableName: 'typeorm_cache',
    duration: 30000,
  },
};
