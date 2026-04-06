import { Controller, Post, UseGuards, Request, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Rate limit login to 5 attempts per minute to prevent brute-force attacks
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req, @Body() body: { userId: string; password: string }) {
    return this.authService.login(req.user);
  }

  @Post('verify')
  async verifyToken(@Body() body: { token: string }) {
    return this.authService.verifyToken(body.token);
  }
}
