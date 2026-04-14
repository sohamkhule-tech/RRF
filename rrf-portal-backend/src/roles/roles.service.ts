import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  /**
   * Get all roles with their details
   * Used by admin panel for role listing
   */
  async findAll(): Promise<Role[]> {
    return this.rolesRepository.find({
      where: { isActive: true },
      order: { priority: 'ASC' },
    });
  }
}
