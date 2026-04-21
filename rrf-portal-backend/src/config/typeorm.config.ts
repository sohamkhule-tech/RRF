import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'rrf_portal',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production', // Auto-create tables in dev
  logging: process.env.NODE_ENV !== 'production',
  
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
