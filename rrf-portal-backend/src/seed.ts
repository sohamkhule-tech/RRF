import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SeedModule } from './database/seed.module';
import { SeedService } from './database/seed.service';

async function runSeed() {
  console.log('\n🌱 Bootstrapping seed context...');
  console.log(`   DB_HOST: ${process.env.DB_HOST || 'localhost (default)'}`);
  console.log(`   DB_DATABASE: ${process.env.DB_DATABASE || 'rrf_portal (default)'}\n`);

  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const seedService = app.get(SeedService);
    await seedService.seedAll();
    console.log('\n✅ Seeding completed successfully!\n');
  } catch (err) {
    console.error('\n❌ Seeding failed:');
    console.error(err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runSeed();