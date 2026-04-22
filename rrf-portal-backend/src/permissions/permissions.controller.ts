import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/permissions.decorator';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  /**
   * Get all active permissions with module information
   * GET /permissions
   * Used by admin to populate permission selection UI
   */
  @RequirePermission('ROLES.UPDATE')
  @Get()
  async findAll() {
    const permissions = await this.permissionsService.findAllWithModules();
    return {
      success: true,
      data: permissions,
    };
  }
}
