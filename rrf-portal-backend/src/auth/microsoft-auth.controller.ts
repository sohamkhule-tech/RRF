import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { MicrosoftAuthService } from './microsoft-auth.service';
import { AuthService } from './auth.service';

export class MicrosoftCallbackDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  state: string;
}

@Controller('auth')
export class MicrosoftAuthController {
  constructor(
    private readonly microsoftAuthService: MicrosoftAuthService,
    private readonly authService: AuthService,
  ) {}

  /**
   * GET /auth/microsoft
   *
   * Returns the Microsoft OAuth authorization URL with a signed state parameter.
   * Frontend redirects the user to this URL to initiate SSO.
   */
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Get('microsoft')
  @HttpCode(HttpStatus.OK)
  getMicrosoftAuthUrl() {
    return this.microsoftAuthService.getAuthUrl();
  }

  /**
   * POST /auth/microsoft/callback
   *
   * Receives the authorization code + state from the frontend callback page.
   * Validates state, exchanges code server-to-server, validates ID token,
   * finds user, and issues the app JWT.
   *
   * Response format is IDENTICAL to POST /auth/login.
   */
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('microsoft/callback')
  @HttpCode(HttpStatus.OK)
  async microsoftCallback(@Body() dto: MicrosoftCallbackDto) {
    // Full flow: validate state → exchange code → validate token → find user
    const user = await this.microsoftAuthService.handleCallback(dto.code, dto.state);

    // Issue app JWT via shared login method (identical response to /auth/login)
    return this.authService.login(user);
  }
}
