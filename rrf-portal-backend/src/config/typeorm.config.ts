import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: {
  rejectUnauthorized: false,
  },
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production', // Auto-create tables in dev
  logging: process.env.NODE_ENV !== 'production',
  
  // ✅ CONNECTION RESILIENCE: Handle Docker startup timing
  retryAttempts: 10,
  retryDelay: 3000,
  
  // ✅ PERFORMANCE OPTIMIZATION: Connection pooling
  poolSize: 20,                    // Max concurrent connections
  connectTimeoutMS: 10000,         // 10 seconds timeout
  maxQueryExecutionTime: 5000,     // Log slow queries (>5s)
  
  // ✅ Additional optimizations
  cache: {
    type: 'database',
    tableName: 'typeorm_cache',
    duration: 30000,  // Cache for 30 seconds
  },
};
