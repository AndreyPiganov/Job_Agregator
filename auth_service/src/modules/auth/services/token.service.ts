import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { sha256 } from 'js-sha256';
import { randomUUID } from 'node:crypto';
import type {
  AccessTokenPayload,
  AuthPrincipal,
  AuthSubject,
  RefreshTokenPayload,
  RefreshTokenPrincipal,
  TokenPair,
} from '../interfaces/auth.interfaces';

@Injectable()
export class TokenService {
  private readonly accessPrivateKey: string;
  private readonly accessPublicKey: string;
  private readonly refreshSecret: string;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessPrivateKey = config.getOrThrow<string>('jwt.accessPrivateKey');
    this.accessPublicKey = config.getOrThrow<string>('jwt.accessPublicKey');
    this.refreshSecret = config.getOrThrow<string>('jwt.refreshSecret');
    this.accessTtlSeconds = config.getOrThrow<number>('jwt.accessTtlSeconds');
    this.refreshTtlSeconds = config.getOrThrow<number>('jwt.refreshTtlSeconds');
    this.issuer = config.getOrThrow<string>('jwt.issuer');
    this.audience = config.getOrThrow<string>('jwt.audience');
  }

  async issueTokenPair(subject: AuthSubject, sessionId: string): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: subject.id, sid: sessionId, roles: subject.roles, typ: 'access' } satisfies AccessTokenPayload,
        this.accessSignOptions(),
      ),
      this.jwt.signAsync(
        { sub: subject.id, sid: sessionId, typ: 'refresh' } satisfies RefreshTokenPayload,
        this.refreshSignOptions(),
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresInSeconds: this.accessTtlSeconds,
      refreshTokenExpiresInSeconds: this.refreshTtlSeconds,
    };
  }

  async verifyAccessToken(token: string): Promise<AuthPrincipal | null> {
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, this.accessVerifyOptions());
      if (
        payload.typ !== 'access' ||
        typeof payload.sub !== 'string' ||
        typeof payload.sid !== 'string' ||
        !Array.isArray(payload.roles) ||
        !payload.roles.every((role) => typeof role === 'string')
      ) {
        return null;
      }

      return { userId: payload.sub, sessionId: payload.sid, roles: payload.roles };
    } catch {
      return null;
    }
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPrincipal | null> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, this.refreshVerifyOptions());
      if (payload.typ !== 'refresh' || typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
        return null;
      }

      return { userId: payload.sub, sessionId: payload.sid };
    } catch {
      return null;
    }
  }

  fingerprint(token: string): string {
    return sha256(token);
  }

  private accessSignOptions() {
    return {
      privateKey: this.accessPrivateKey,
      algorithm: 'RS256' as const,
      expiresIn: this.accessTtlSeconds,
      issuer: this.issuer,
      audience: this.audience,
      jwtid: randomUUID(),
    };
  }

  private refreshSignOptions() {
    return {
      secret: this.refreshSecret,
      algorithm: 'HS256' as const,
      expiresIn: this.refreshTtlSeconds,
      issuer: this.issuer,
      audience: this.audience,
      jwtid: randomUUID(),
    };
  }

  private accessVerifyOptions() {
    return {
      publicKey: this.accessPublicKey,
      algorithms: ['RS256' as const],
      issuer: this.issuer,
      audience: this.audience,
    };
  }

  private refreshVerifyOptions() {
    return {
      secret: this.refreshSecret,
      algorithms: ['HS256' as const],
      issuer: this.issuer,
      audience: this.audience,
    };
  }
}
