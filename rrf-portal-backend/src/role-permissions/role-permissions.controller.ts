import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { RolePermissionsService } from './role-permissions.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RolePermissionsController {
  constructor(private rolePermissionsService: RolePermissionsService) {}

  /**
   * Get permissions assigned to a specific role
   * GET /roles/:roleId/permissions
   */
  @RequirePermission('ROLES.UPDATE')
  @Get(':roleId/permissions')
  async getRolePermissions(@Param('roleId', ParseIntPipe) roleId: number) {
    const permissions = await this.rolePermissionsService.getRolePermissions(
      roleId,
    );
    return {
      success: true,
      data: permissions,
    };
  }

  /**
   * Update permissions for a role
   * PUT /roles/:roleId/permissions
   * Body: { permissionIds: number[] }
   */
  @RequirePermission('ROLES.UPDATE')
  @Put(':roleId/permissions')
  async updateRolePermissions(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    const permissions = await this.rolePermissionsService.updateRolePermissions(
      roleId,
      dto.permissionIds,
    );
    return {
      success: true,
      message: 'Role permissions updated successfully',
      data: permissions,
    };
  }
}
