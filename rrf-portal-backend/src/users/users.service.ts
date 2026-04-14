import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Role } from '../roles/role.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  // ============================================================
  // EXISTING METHODS — unchanged
  // ============================================================

  async findByUserId(userId: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { userId },
      relations: ['role'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });
  }

  async validateUser(userId: string, password: string): Promise<User | null> {
    const user = await this.findByUserId(userId);
    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async updateLastLogin(userId: number): Promise<void> {
    await this.usersRepository.update(userId, {
      lastLogin: new Date(),
    });
  }

  // ============================================================
  // ADMIN PANEL — new methods
  // ============================================================

  /**
   * List all users with their roles (excludes password hash)
   */
  async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await this.usersRepository.find({
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });

    return users.map(({ passwordHash, ...user }) => user as any);
  }

  /**
   * List all available roles (for admin dropdowns)
   */
  async findAllRoles(): Promise<Role[]> {
    return this.rolesRepository.find({
      where: { isActive: true },
      order: { priority: 'ASC' },
    });
  }

  /**
   * Admin: Create a new user
   */
  async createUser(data: {
    userId: string;
    email: string;
    password: string;
    fullName: string;
    department?: string;
    phone?: string;
    roleId: number;
  }): Promise<Omit<User, 'passwordHash'>> {
    // Check for duplicate userId
    const existingUserId = await this.findByUserId(data.userId);
    if (existingUserId) {
      throw new ConflictException(`User ID "${data.userId}" already exists`);
    }

    // Check for duplicate email
    const existingEmail = await this.findByEmail(data.email);
    if (existingEmail) {
      throw new ConflictException(`Email "${data.email}" already exists`);
    }

    // Validate role exists
    const role = await this.rolesRepository.findOne({ where: { id: data.roleId } });
    if (!role) {
      throw new BadRequestException(`Role with ID ${data.roleId} does not exist`);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = this.usersRepository.create({
      userId: data.userId,
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      department: data.department || null,
      phone: data.phone || null,
      role: role,
      isActive: true,
    });

    const saved = await this.usersRepository.save(user);
    const { passwordHash: _, ...result } = saved;
    return result as any;
  }

  /**
   * Admin: Update user (role, active status, basic fields)
   * Explicitly prevents accidental password overwrite.
   */
  async updateUser(
    id: number,
    data: {
      roleId?: number;
      isActive?: boolean;
      fullName?: string;
      department?: string;
      phone?: string;
    },
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Validate and update role if provided
    if (data.roleId !== undefined) {
      const role = await this.rolesRepository.findOne({ where: { id: data.roleId } });
      if (!role) {
        throw new BadRequestException(`Role with ID ${data.roleId} does not exist`);
      }
      user.role = role;
    }

    // Update simple fields
    if (data.isActive !== undefined) user.isActive = data.isActive;
    if (data.fullName !== undefined) user.fullName = data.fullName;
    if (data.department !== undefined) user.department = data.department;
    if (data.phone !== undefined) user.phone = data.phone;

    const saved = await this.usersRepository.save(user);
    const { passwordHash, ...result } = saved;
    return result as any;
  }
}
