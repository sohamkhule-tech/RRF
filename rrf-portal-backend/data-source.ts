const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,

  // ✅ FIX: REQUIRED FOR AWS
  ssl: {
    rejectUnauthorized: false,
  },
  extra: {
    ssl: {
      rejectUnauthorized: false,
    },
  },

  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
  migrationsTableName: 'typeorm_migrations',

  synchronize: false,
  logging: ['error', 'warn'],

  poolSize: 10,
  connectTimeoutMS: 10000,
});
