import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from './user.entity';
import { Role } from '../roles/role.entity';
import { UserSubfunction } from '../user-subfunctions/user-subfunction.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(UserSubfunction)
    private userSubfunctionRepository: Repository<UserSubfunction>,
    private eventEmitter: EventEmitter2,
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
   * List all users with their roles and subfunctions (excludes password hash)
   */
  async findAll(): Promise<any[]> {
    const users = await this.usersRepository.find({
      relations: ['role', 'userSubfunctions', 'userSubfunctions.subfunction'],
      order: { createdAt: 'DESC' },
    });

    return users.map(({ passwordHash, ...user }) => {
      const subfunctions = user.userSubfunctions?.map(us => us.subfunction) || [];
      const { userSubfunctions, ...userData } = user as any;
      return {
        ...userData,
        subfunctions,
      };
    });
  }

  /**
   * List all available roles (for admin dropdowns)
   */
  async findAllRoles(): Promise<Role[]> {
    return this.rolesRepository.find();
  }

  /**
   * Create a new user with optional subfunction assignment
   */
  async createUser(data: CreateUserDto): Promise<any> {
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

    // Validate subfunctions for APPROVER role
    if (role.roleCode === 'APPROVER') {
      if (!data.subfunctionIds || data.subfunctionIds.length === 0) {
        throw new BadRequestException('At least one subfunction must be selected for APPROVER role');
      }
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
      technologies: data.technologies || [],
    });

    const saved = await this.usersRepository.save(user);

    // Assign subfunctions if provided
    if (data.subfunctionIds && data.subfunctionIds.length > 0) {
      await this.assignSubfunctions(saved.id, data.subfunctionIds);
    }

    // Fetch user with subfunctions
    const userWithSubfunctions = await this.usersRepository.findOne({
      where: { id: saved.id },
      relations: ['role', 'userSubfunctions', 'userSubfunctions.subfunction'],
    });

    const { passwordHash: _, userSubfunctions, ...result } = userWithSubfunctions;
    const createdResult = {
      ...result,
      subfunctions: userSubfunctions?.map(us => us.subfunction) || [],
    };

    // Emit notification after successful user creation
    this.eventEmitter.emit('user.created', {
      type: 'USER_CREATED',
      priority: 'MEDIUM',
      entityType: 'USER',
      entityId: saved.id,
      actorId: saved.id,
      targetUserId: saved.id,
      targetUserName: saved.fullName,
      roleName: role.roleName,
      metadata: { roleName: role.roleName },
    });

    return createdResult;
  }

  /**
   * Admin: Update user with subfunction management
   */
  async updateUser(id: number, data: UpdateUserDto): Promise<any> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Capture previous state for notification detection
    const previousRoleId = user.role?.id;
    const previousIsActive = user.isActive;

    let role = user.role;

    // Validate and update role if provided
    if (data.roleId !== undefined) {
      const newRole = await this.rolesRepository.findOne({ where: { id: data.roleId } });
      if (!newRole) {
        throw new BadRequestException(`Role with ID ${data.roleId} does not exist`);
      }
      role = newRole;
      user.role = role;
    }

    // Validate subfunctions for APPROVER role
    if (role.roleCode === 'APPROVER') {
      if (data.subfunctionIds === undefined || data.subfunctionIds.length === 0) {
        // If changing TO approver or updating approver without subfunctions, require at least one
        const existing = await this.userSubfunctionRepository.count({ where: { userId: id } });
        if (existing === 0 && (!data.subfunctionIds || data.subfunctionIds.length === 0)) {
          throw new BadRequestException('At least one subfunction must be selected for APPROVER role');
        }
      }
    }

    // Update simple fields
    if (data.isActive !== undefined) user.isActive = data.isActive;
    if (data.fullName !== undefined) user.fullName = data.fullName;
    if (data.department !== undefined) user.department = data.department;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.technologies !== undefined) user.technologies = data.technologies;

    const saved = await this.usersRepository.save(user);

    // Update subfunctions if provided
    if (data.subfunctionIds !== undefined) {
      await this.assignSubfunctions(saved.id, data.subfunctionIds);
    }

    // Fetch user with subfunctions
    const userWithSubfunctions = await this.usersRepository.findOne({
      where: { id: saved.id },
      relations: ['role', 'userSubfunctions', 'userSubfunctions.subfunction'],
    });

    const { passwordHash, userSubfunctions, ...result } = userWithSubfunctions;
    const updatedResult = {
      ...result,
      subfunctions: userSubfunctions?.map(us => us.subfunction) || [],
    };

    // Emit notification events based on what changed
    const roleChanged = data.roleId !== undefined && data.roleId !== previousRoleId;
    const activated = data.isActive === true && previousIsActive === false;
    const deactivated = data.isActive === false && previousIsActive === true;
    const subfunctionsChanged = data.subfunctionIds !== undefined;

    if (roleChanged) {
      this.eventEmitter.emit('user.role-changed', {
        type: 'USER_ROLE_CHANGED',
        priority: 'MEDIUM',
        entityType: 'USER',
        entityId: id,
        actorId: id,
        targetUserId: id,
        targetUserName: saved.fullName,
        roleName: role.roleName,
        metadata: { roleName: role.roleName },
      });
    } else if (activated) {
      this.eventEmitter.emit('user.activated', {
        type: 'USER_ACTIVATED',
        priority: 'MEDIUM',
        entityType: 'USER',
        entityId: id,
        actorId: id,
        targetUserId: id,
        targetUserName: saved.fullName,
      });
    } else if (deactivated) {
      this.eventEmitter.emit('user.deactivated', {
        type: 'USER_DEACTIVATED',
        priority: 'MEDIUM',
        entityType: 'USER',
        entityId: id,
        actorId: id,
        targetUserId: id,
        targetUserName: saved.fullName,
      });
    } else if (subfunctionsChanged) {
      this.eventEmitter.emit('user.subfunctions-changed', {
        type: 'USER_SUBFUNCTIONS_CHANGED',
        priority: 'MEDIUM',
        entityType: 'USER',
        entityId: id,
        actorId: id,
        targetUserId: id,
        targetUserName: saved.fullName,
      });
    } else {
      this.eventEmitter.emit('user.updated', {
        type: 'USER_UPDATED',
        priority: 'LOW',
        entityType: 'USER',
        entityId: id,
        actorId: id,
        targetUserId: id,
        targetUserName: saved.fullName,
      });
    }

    return updatedResult;
  }

  /**
   * Assign subfunctions to a user (replaces existing assignments)
   */
  private async assignSubfunctions(userId: number, subfunctionIds: number[]): Promise<void> {
    // Remove existing assignments
    await this.userSubfunctionRepository.delete({ userId });

    // Create new assignments
    if (subfunctionIds && subfunctionIds.length > 0) {
      const assignments = subfunctionIds.map(subfunctionId =>
        this.userSubfunctionRepository.create({ userId, subfunctionId }),
      );
      await this.userSubfunctionRepository.save(assignments);
    }
  }

  /**
   * Get user's assigned subfunctions
   */
  async getUserSubfunctions(userId: number): Promise<any[]> {
    const assignments = await this.userSubfunctionRepository.find({
      where: { userId },
      relations: ['subfunction'],
    });
    return assignments.map(a => a.subfunction);
  }
}
