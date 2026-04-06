import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private permissionsService: PermissionsService,
    private jwtService: JwtService,
  ) {}

  async validateUser(userId: string, password: string): Promise<any> {
    const user = await this.usersService.validateUser(userId, password);
    if (!user) {
      return null;
    }
    return user;
  }

  async login(user: any) {
    // Get user's permissions from database
    const permissions = await this.permissionsService.getUserPermissions(user.id);

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    const payload = { userId: user.id, sub: user.id, roleCode: user.role.roleCode};
    
    return {
      success: true,
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        userId: user.userId,
        name: user.fullName,
        email: user.email,
        role: {
          id: user.role.id,
          code: user.role.roleCode,
          name: user.role.roleName,
        },
        department: user.department,
        permissions: permissions, // Array of "MODULE.ACTION" strings
      },
    };
  }

  async validateToken(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      return null;
    }
    return user;
  }

  async verifyToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.validateToken(payload);
      
      if (!user) {
        return { valid: false, error: 'User not found or inactive' };
      }

      // Get latest permissions
      const permissions = await this.permissionsService.getUserPermissions(user.id);

      return {
        valid: true,
        user: {
          id: user.id,
          userId: user.userId,
          name: user.fullName,
          email: user.email,
          role: {
            id: user.role.id,
            code: user.role.roleCode,
            name: user.role.roleName,
          },
          department: user.department,
          permissions: permissions,
        },
      };
    } catch (error) {
      return { valid: false, error: 'Invalid or expired token' };
    }
  }
}
