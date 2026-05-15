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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/permissions.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
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
   * Create a new user with optional subfunction assignment
   * POST /users
   */
  @RequirePermission('USERS.CREATE')
  @Post()
  @ApiOperation({
    summary: 'Create new user',
    description: 'Creates a new user. If role is APPROVER, subfunctionIds must be provided.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or missing subfunctions for APPROVER' })
  @ApiResponse({ status: 409, description: 'User ID or email already exists' })
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(createUserDto);
    return {
      success: true,
      message: 'User created successfully',
      data: user,
    };
  }

  /**
   * Update user with subfunction management
   * PUT /users/:id
   */
  @RequirePermission('USERS.UPDATE')
  @Put(':id')
  @ApiOperation({
    summary: 'Update user',
    description: 'Updates user details. If role is changed to APPROVER, subfunctionIds must be provided.',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.updateUser(id, updateUserDto);
    return {
      success: true,
      message: 'User updated successfully',
      data: user,
    };
  }
}
