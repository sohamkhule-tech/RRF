import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RolePermission } from './role-permission.entity';
import { Role } from '../roles/role.entity';
import { Permission } from '../permissions/permission.entity';

@Injectable()
export class RolePermissionsService {
  constructor(
    @InjectRepository(RolePermission)
    private rolePermissionsRepository: Repository<RolePermission>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * Get all permissions assigned to a specific role
   * Uses optimized query with relations to avoid N+1 problem
   */
  async getRolePermissions(roleId: number) {
    // Verify role exists
    const role = await this.rolesRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Fetch role permissions with relations in a single query
    const rolePermissions = await this.rolePermissionsRepository.find({
      where: { roleId },
      relations: ['permission', 'permission.module'],
      order: {
        permission: {
          module: { displayOrder: 'ASC' },
          permissionName: 'ASC',
        },
      },
    });

    // Transform to clean response format
    return rolePermissions.map((rp) => ({
      id: rp.permission.id,
      permissionName: rp.permission.permissionName,
      permissionCode: rp.permission.permissionCode,
      description: rp.permission.description,
      module: {
        id: rp.permission.module.id,
        moduleCode: rp.permission.module.moduleCode,
        moduleName: rp.permission.module.moduleName,
      },
      grantedAt: rp.grantedAt,
    }));
  }

  /**
   * Update role permissions with transaction safety
   * - Validates role and permissions exist
   * - Deduplicates permission IDs
   * - Uses transaction to ensure atomicity
   * - Handles empty array (clears all permissions)
   */
  async updateRolePermissions(roleId: number, permissionIds: number[]) {
    // Step 1: Validate role exists
    const role = await this.rolesRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Step 2: Deduplicate permission IDs
    const uniqueIds = [...new Set(permissionIds)];

    // Step 3: Validate all permissions exist (if any provided)
    if (uniqueIds.length > 0) {
      const existingPermissions = await this.permissionsRepository.find({
        where: uniqueIds.map((id) => ({ id })),
        select: ['id'],
      });

      if (existingPermissions.length !== uniqueIds.length) {
        const foundIds = existingPermissions.map((p) => p.id);
        const invalidIds = uniqueIds.filter((id) => !foundIds.includes(id));
        throw new BadRequestException(
          `Invalid permission IDs: ${invalidIds.join(', ')}`,
        );
      }
    }

    // Step 4: Use transaction for atomic delete + insert
    await this.dataSource.transaction(async (manager) => {
      // Delete existing role permissions
      await manager.delete(RolePermission, { roleId });

      // Insert new mappings (if any)
      if (uniqueIds.length > 0) {
        const mappings = uniqueIds.map((permissionId) => ({
          roleId,
          permissionId,
          grantedAt: new Date(),
        }));

        await manager.save(RolePermission, mappings);
      }
    });

    // Step 5: Return updated permissions
    return this.getRolePermissions(roleId);
  }
}
