import { Controller, Post } from '@nestjs/common';
import { SeedService } from './seed.service';
import { MigrateSubIdService } from './migrate-subid.service';

@Controller('seed')
export class SeedController {
  constructor(
    private readonly seedService: SeedService,
    private readonly migrateSubIdService: MigrateSubIdService,
  ) {}

  @Post()
  async seedDatabase() {
    // Only allow seeding if DB is empty (idempotent guard)
    try {
      await this.seedService.seedAll();
      return {
        success: true,
        message: 'Database seeded successfully!',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Database seeding failed',
        error: error.message,
      };
    }
  }

  @Post('migrate-sub-ids')
  async migrateSubIds() {
    try {
      return await this.migrateSubIdService.migrateExistingRecords();
    } catch (error) {
      return {
        success: false,
        updated: 0,
        message: 'Migration failed',
        error: error.message,
      };
    }
  }
}
