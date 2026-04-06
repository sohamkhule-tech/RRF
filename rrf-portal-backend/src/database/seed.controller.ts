import { Controller, Post, ForbiddenException } from '@nestjs/common';
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
    // Only allow seeding in development environment
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Database seeding is disabled in production');
    }

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
    // Only allow migration in development environment
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Database migration is disabled in production');
    }

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
