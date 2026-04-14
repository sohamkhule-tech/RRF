import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  /**
   * Get all roles
   * GET /roles
   * Used by admin panel for role listing and management
   */
  @RequirePermission('ROLES.READ')
  @Get()
  async findAll() {
    const roles = await this.rolesService.findAll();
    return {
      success: true,
      data: roles,
    };
  }
}
