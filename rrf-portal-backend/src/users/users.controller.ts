import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ============================================================
  // EXISTING
  // ============================================================

  @RequirePermission('USERS.READ')
  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    const { passwordHash, ...result } = user;
    return result;
  }

  // ============================================================
  // ADMIN — User Management
  // ============================================================

  /**
   * List all available roles (for admin dropdowns)
   * GET /users/roles
   * NOTE: Must come BEFORE /users/:id to avoid route conflict
   */
  @RequirePermission('USERS.READ')
  @Get('roles')
  async getRoles() {
    const roles = await this.usersService.findAllRoles();
    return {
      success: true,
      data: roles,
    };
  }

  /**
   * List all users
   * GET /users
   */
  @RequirePermission('USERS.READ')
  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return {
      success: true,
      data: users,
    };
  }

  /**
   * Create a new user
   * POST /users
   */
  @RequirePermission('USERS.CREATE')
  @Post()
  async createUser(
    @Body()
    body: {
      userId: string;
      email: string;
      password: string;
      fullName: string;
      department?: string;
      phone?: string;
      roleId: number;
    },
  ) {
    const user = await this.usersService.createUser(body);
    return {
      success: true,
      message: 'User created successfully',
      data: user,
    };
  }

  /**
   * Update user (role, status, profile fields)
   * PUT /users/:id
   */
  @RequirePermission('USERS.UPDATE')
  @Put(':id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      roleId?: number;
      isActive?: boolean;
      fullName?: string;
      department?: string;
      phone?: string;
    },
  ) {
    const user = await this.usersService.updateUser(id, body);
    return {
      success: true,
      message: 'User updated successfully',
      data: user,
    };
  }
}
