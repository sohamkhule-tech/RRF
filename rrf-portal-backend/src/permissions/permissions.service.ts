import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
  ) {}

  async getUserPermissions(userId: number): Promise<string[]> {
    const query = `
      SELECT DISTINCT CONCAT(m.module_code, '.', p.permission_code) as permission_code
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      INNER JOIN role_permissions rp ON r.id = rp.role_id
      INNER JOIN permissions p ON rp.permission_id = p.id
      INNER JOIN modules m ON p.module_id = m.id
      WHERE u.id = $1
        AND u.is_active = true
        AND r.is_active = true
        AND p.is_active = true
        AND m.is_active = true
      ORDER BY permission_code
    `;

    const results = await this.permissionsRepository.query(query, [userId]);
    return results.map((row: any) => row.permission_code);
  }

  async checkUserPermission(userId: number, requiredPermission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(requiredPermission);
  }
}
