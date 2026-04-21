import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Module } from '../modules/module.entity';
import { Permission } from '../permissions/permission.entity';
import { Role } from '../roles/role.entity';
import { RolePermission } from '../role-permissions/role-permission.entity';

@Controller('add-permissions')
export class AddPermissionsController {
  constructor(
    @InjectRepository(Module)
    private moduleRepository: Repository<Module>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async addMissingPermissions() {
    try {
      // Get RRF module
      const rrfModule = await this.moduleRepository.findOne({
        where: { moduleCode: 'RRF' },
      });

      if (!rrfModule) {
        return { success: false, message: 'RRF module not found' };
      }

      // Get PMO and HR roles
      const pmoRole = await this.roleRepository.findOne({
        where: { roleCode: 'PMO' },
      });
      const hrRole = await this.roleRepository.findOne({
        where: { roleCode: 'HR' },
      });

      if (!pmoRole || !hrRole) {
        return { success: false, message: 'PMO or HR role not found' };
      }

      const permissionsToAdd = [
        {
          code: 'OPEN_FOR_HIRING',
          name: 'Open for Hiring',
          description: 'Mark RRF as open for hiring',
          roles: [pmoRole.id],
        },
        {
          code: 'FILL_FROM_BENCH',
          name: 'Fill from Bench',
          description: 'Fill position from bench resources',
          roles: [pmoRole.id],
        },
        {
          code: 'CLOSE',
          name: 'Close RRF',
          description: 'Close resource requisition forms',
          roles: [pmoRole.id, hrRole.id],
        },
      ];

      const results = [];

      for (const permData of permissionsToAdd) {
        // Check if permission exists
        let permission = await this.permissionRepository.findOne({
          where: {
            moduleId: rrfModule.id,
            permissionCode: permData.code,
          },
        });

        // Create if doesn't exist
        if (!permission) {
          permission = this.permissionRepository.create({
            moduleId: rrfModule.id,
            permissionName: permData.name,
            permissionCode: permData.code,
            description: permData.description,
            isActive: true,
          });
          await this.permissionRepository.save(permission);
          results.push(`✓ Created permission: RRF.${permData.code}`);
        } else {
          results.push(`⊙ Permission exists: RRF.${permData.code}`);
        }

        // Assign to roles
        for (const roleId of permData.roles) {
          const existingMapping = await this.rolePermissionRepository.findOne({
            where: {
              roleId: roleId,
              permissionId: permission.id,
            },
          });

          if (!existingMapping) {
            const mapping = this.rolePermissionRepository.create({
              roleId: roleId,
              permissionId: permission.id,
            });
            await this.rolePermissionRepository.save(mapping);
            const roleName = roleId === pmoRole.id ? 'PMO' : 'HR';
            results.push(`✓ Assigned RRF.${permData.code} to ${roleName}`);
          }
        }
      }

      return {
        success: true,
        message: 'Missing RRF workflow permissions added successfully',
        details: results,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error adding permissions',
        error: error.message,
      };
    }
  }
}
