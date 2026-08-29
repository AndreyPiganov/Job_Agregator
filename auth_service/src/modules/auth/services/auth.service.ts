import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthApplicationError } from '../../../common/errors/auth-application.error';
import { LoginRequest, RegisterRequest } from '../../../generated/auth/v1/auth';
import { AuthMapper } from '../mappers/auth.mapper';
import { UserClient } from '../clients/user.client';
import type {
  AuthPrincipal,
  AuthSession,
  AuthSubject,
  IdentityRecord,
  LoginIdentifier,
  TokenPair,
} from '../interfaces/auth.interfaces';
import { IdentityRepository } from '../repositories/identity.repository';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly identities: IdentityRepository,
    private readonly users: UserClient,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly sessions: SessionService,
    private readonly mapper: AuthMapper,
  ) {}

  async register(request: RegisterRequest): Promise<AuthSession> {
    const registration = this.mapper.registrationFromGrpc(request);

    // TODO(identifier-verification): For email, atomically consume a REGISTRATION
    // record from auth.email_codes. Add the equivalent phone-code flow before
    // enabling either verification requirement. Registration bypasses both today.
    const identity = await this.findOrCreatePendingIdentity(registration.identifier, registration.password);

    // CreateUser atomically creates User, UserProfile and the initial contact.
    // It is idempotent, so the same credentials can resume a PENDING registration.
    await this.users.createUser({
      user_id: identity.id,
      first_name: registration.firstName,
      last_name: registration.lastName,
      email: registration.identifier.email ?? undefined,
      phone_number: registration.identifier.phoneNumber ?? undefined,
    });
    const activeIdentity = await this.identities.activate(identity.id);
    return this.createSession(this.mapper.identityToSubject(activeIdentity));
  }

  async login(request: LoginRequest): Promise<AuthSession> {
    const identifier = this.mapper.loginIdentifierFromGrpc(request);

    const identity = await this.identities.findByIdentifier(identifier);
    const passwordHash = identity?.passwordHash;
    if (identity?.status !== 'ACTIVE' || !passwordHash) {
      throw AuthApplicationError.invalidCredentials();
    }

    const passwordMatches = await this.passwords.verify(request.password, passwordHash);
    if (!passwordMatches) {
      throw AuthApplicationError.invalidCredentials();
    }

    await this.identities.recordSuccessfulLogin(identity.id);
    return this.createSession(this.mapper.identityToSubject(identity));
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const principal = await this.tokens.verifyRefreshToken(refreshToken);
    if (!principal) {
      throw AuthApplicationError.invalidToken();
    }

    const identity = await this.identities.findById(principal.userId);
    if (identity?.status !== 'ACTIVE') {
      throw AuthApplicationError.invalidToken();
    }

    const tokens = await this.tokens.issueTokenPair(this.mapper.identityToSubject(identity), principal.sessionId);
    const rotated = await this.sessions.rotate({
      sessionId: principal.sessionId,
      userId: principal.userId,
      expectedRefreshTokenFingerprint: this.tokens.fingerprint(refreshToken),
      nextRefreshTokenFingerprint: this.tokens.fingerprint(tokens.refreshToken),
      ttlSeconds: tokens.refreshTokenExpiresInSeconds,
    });
    if (!rotated) {
      throw AuthApplicationError.invalidToken();
    }

    return tokens;
  }

  async validateAccessToken(accessToken: string): Promise<AuthPrincipal> {
    const principal = await this.tokens.verifyAccessToken(accessToken);
    if (!principal) {
      throw AuthApplicationError.invalidToken();
    }

    const session = await this.sessions.find(principal.sessionId);
    if (!session || session.userId !== principal.userId) {
      throw AuthApplicationError.invalidToken();
    }

    const identity = await this.identities.findById(principal.userId);
    if (identity?.status !== 'ACTIVE') {
      throw AuthApplicationError.invalidToken();
    }

    return { ...principal, roles: [...identity.roles] };
  }

  async logout(refreshToken: string): Promise<boolean> {
    const principal = await this.tokens.verifyRefreshToken(refreshToken);
    if (!principal) {
      throw AuthApplicationError.invalidToken();
    }

    return this.sessions.revoke({
      sessionId: principal.sessionId,
      userId: principal.userId,
      refreshTokenFingerprint: this.tokens.fingerprint(refreshToken),
    });
  }

  private async createSession(subject: AuthSubject): Promise<AuthSession> {
    const sessionId = randomUUID();
    const tokens = await this.tokens.issueTokenPair(subject, sessionId);
    await this.sessions.create({
      sessionId,
      userId: subject.id,
      refreshTokenFingerprint: this.tokens.fingerprint(tokens.refreshToken),
      ttlSeconds: tokens.refreshTokenExpiresInSeconds,
    });

    return { subject, tokens };
  }

  private async findOrCreatePendingIdentity(identifier: LoginIdentifier, password: string): Promise<IdentityRecord> {
    const existing = await this.identities.findByIdentifier(identifier);
    if (existing) {
      return this.resumePendingIdentity(existing, password);
    }

    const passwordHash = await this.passwords.hash(password);
    return this.identities.createPasswordIdentity(identifier, passwordHash);
  }

  private async resumePendingIdentity(identity: IdentityRecord, password: string): Promise<IdentityRecord> {
    if (identity.status !== 'PENDING' || !identity.passwordHash) {
      throw AuthApplicationError.identifierAlreadyExists();
    }

    const passwordMatches = await this.passwords.verify(password, identity.passwordHash);
    if (!passwordMatches) {
      throw AuthApplicationError.identifierAlreadyExists();
    }
    return identity;
  }
}
