import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as jwksClient from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';

interface MicrosoftTokenClaims {
  email: string;
  preferred_username?: string;
  oid: string;
  name?: string;
  tid: string;
}

@Injectable()
export class MicrosoftAuthService {
  private readonly logger = new Logger(MicrosoftAuthService.name);
  private readonly jwksClient: jwksClient.JwksClient;
  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly allowedDomains: string[];

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.tenantId = this.configService.get<string>('AZURE_TENANT_ID', '');
    this.clientId = this.configService.get<string>('AZURE_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>('AZURE_CLIENT_SECRET', '');
    this.redirectUri = this.configService.get<string>('AZURE_REDIRECT_URI', 'http://localhost:3000/auth/callback');

    const allowedDomainsStr = this.configService.get<string>('AZURE_ALLOWED_DOMAINS', '');
    this.allowedDomains = allowedDomainsStr
      ? allowedDomainsStr.split(',').map((d) => d.trim().toLowerCase())
      : [];

    this.jwksClient = jwksClient({
      jwksUri: `https://login.microsoftonline.com/${this.tenantId}/discovery/v2.0/keys`,
      cache: true,
      cacheMaxAge: 86400000,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  /**
   * Generates the Microsoft OAuth authorization URL with a signed state parameter.
   * The state JWT prevents CSRF attacks.
   */
  getAuthUrl(): { authUrl: string } {
    if (!this.tenantId || !this.clientId) {
      throw new UnauthorizedException('Microsoft login is not configured.');
    }

    // Generate anti-CSRF state token (signed JWT, 10min TTL)
    const state = this.jwtService.sign(
      { purpose: 'microsoft_sso', timestamp: Date.now() },
      { expiresIn: '10m' },
    );

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: 'openid profile email',
      state,
      response_mode: 'query',
      prompt: 'select_account',
    });

    const authUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;

    return { authUrl };
  }

  /**
   * Handles the full OAuth callback flow:
   * 1. Validate state (anti-CSRF)
   * 2. Exchange code for tokens (server-to-server)
   * 3. Validate ID token via JWKS
   * 4. Validate domain
   * 5. Find user
   */
  async handleCallback(code: string, state: string) {
    // 1. Validate state JWT
    this.validateState(state);

    // 2. Exchange authorization code for tokens
    const tokens = await this.exchangeCodeForTokens(code);

    // 3. Validate the ID token cryptographically
    const claims = await this.validateIdToken(tokens.id_token);

    // 4. Find user by verified email
    const user = await this.findUserByEmail(claims.email);

    return user;
  }

  /**
   * Validates the anti-CSRF state JWT.
   * Throws UnauthorizedException if invalid or expired.
   */
  private validateState(state: string): void {
    try {
      const payload = this.jwtService.verify(state);
      if (payload.purpose !== 'microsoft_sso') {
        throw new UnauthorizedException('Invalid state parameter.');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.warn(`State validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired state parameter. Please try again.');
    }
  }

  /**
   * Exchanges the authorization code for Microsoft tokens via server-to-server POST.
   * Uses client_secret (confidential client flow).
   */
  private async exchangeCodeForTokens(code: string): Promise<{ id_token: string; access_token: string }> {
    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
      scope: 'openid profile email',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      this.logger.warn(`Token exchange failed: ${errorData.error_description || response.statusText}`);
      throw new UnauthorizedException('Failed to exchange authorization code. Please try again.');
    }

    const data = await response.json();

    if (!data.id_token) {
      throw new UnauthorizedException('No ID token received from Microsoft.');
    }

    return { id_token: data.id_token, access_token: data.access_token };
  }

  /**
   * Validates a Microsoft ID token cryptographically via JWKS.
   * Verifies: signature (RS256), issuer, audience, expiration, tenant.
   */
  private async validateIdToken(idToken: string): Promise<MicrosoftTokenClaims> {
    try {
      const decoded = jwt.decode(idToken, { complete: true });
      if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new UnauthorizedException('Invalid token format.');
      }

      const signingKey = await this.getSigningKey(decoded.header.kid);

      const payload = jwt.verify(idToken, signingKey, {
        algorithms: ['RS256'],
        issuer: `https://login.microsoftonline.com/${this.tenantId}/v2.0`,
        audience: this.clientId,
        clockTolerance: 10,
      }) as jwt.JwtPayload;

      // Validate tenant
      if (payload.tid && payload.tid !== this.tenantId) {
        throw new UnauthorizedException('Token from unauthorized tenant.');
      }

      // Extract email
      const email = (payload.email || payload.preferred_username || '').toLowerCase();
      if (!email) {
        throw new UnauthorizedException('No email found in Microsoft token.');
      }

      // Validate domain
      if (this.allowedDomains.length > 0) {
        const domain = email.split('@')[1];
        if (!this.allowedDomains.includes(domain)) {
          throw new UnauthorizedException('Email domain not authorized for this application.');
        }
      }

      return {
        email,
        preferred_username: payload.preferred_username,
        oid: payload.oid || payload.sub,
        name: payload.name,
        tid: payload.tid,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;

      this.logger.warn(`ID token validation failed: ${error.message}`);

      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Microsoft token has expired. Please sign in again.');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid Microsoft token.');
      }

      throw new UnauthorizedException('Microsoft authentication failed.');
    }
  }

  /**
   * Looks up a user by verified email. No auto-provisioning.
   */
  private async findUserByEmail(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException(
        'No account found for this email. Please contact your administrator.',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated.');
    }

    return user;
  }

  /**
   * Fetches signing key from Microsoft JWKS endpoint.
   */
  private async getSigningKey(kid: string): Promise<string> {
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      return key.getPublicKey();
    } catch (error) {
      this.logger.error(`Failed to fetch JWKS signing key: ${error.message}`);
      throw new UnauthorizedException('Unable to verify token signature.');
    }
  }
}
