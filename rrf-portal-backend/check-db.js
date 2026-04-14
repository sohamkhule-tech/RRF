const { DataSource } = require('typeorm');

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: '123', // I will assume standard dev password; wait, earlier the .env was used. I'll read .env instead.
  database: 'rrf_portal',
});

async function run() {
  require('dotenv').config();
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'rrf_portal',
  });
  await ds.initialize();
  const res = await ds.query("SELECT id, status, rrf_number FROM rrfs;");
  console.log('RRFs:', res);
  await ds.destroy();
}
run().catch(console.error);
