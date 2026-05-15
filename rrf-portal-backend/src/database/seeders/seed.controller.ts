import { Controller, Post, ForbiddenException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { SeedService } from './seed.service';

@Controller('seed')
@UseGuards(JwtAuthGuard)
export class SeedController {
  constructor(
    private readonly seedService: SeedService,
  ) {}

  @Post()
  async seedDatabase(@CurrentUser() user: AuthUser) {
    // Only allow seeding in development environment
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Database seeding is disabled in production');
    }

    // Only ADMIN role can seed
    if (user.role?.roleCode !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can seed the database');
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
}
