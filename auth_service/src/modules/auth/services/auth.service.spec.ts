import { Prisma } from '../../../generated/prisma/client';
import { AuthApplicationError } from '../../../common/errors/auth-application.error';
import { AuthMapper } from '../mappers/auth.mapper';
import { AuthService } from './auth.service';
import { UserClient } from '../clients/user.client';
import { IdentityRepository } from '../repositories/identity.repository';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import type { IdentityRecord, TokenPair } from '../interfaces/auth.interfaces';

describe('AuthService', () => {
  const userId = '3466eb2d-3daa-4ba9-a3ad-b0df9b2be7fd';
  const activeIdentity: IdentityRecord = {
    id: userId,
    email: 'user@example.com',
    phoneNumber: null,
    passwordHash: 'password-hash',
    roles: ['applicant'],
    status: 'ACTIVE',
  };
  const pendingIdentity: IdentityRecord = { ...activeIdentity, status: 'PENDING' };
  const registration = {
    email: activeIdentity.email ?? undefined,
    password: 'strong-password',
    first_name: 'Ivan',
    last_name: 'Petrov',
  };
  const tokenPair: TokenPair = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    accessTokenExpiresInSeconds: 900,
    refreshTokenExpiresInSeconds: 2_592_000,
  };

  let identities: jest.Mocked<
    Pick<
      IdentityRepository,
      'findByIdentifier' | 'findById' | 'createPasswordIdentity' | 'activate' | 'recordSuccessfulLogin'
    >
  >;
  let users: jest.Mocked<Pick<UserClient, 'createUser'>>;
  let passwords: jest.Mocked<Pick<PasswordService, 'hash' | 'verify'>>;
  let tokens: jest.Mocked<
    Pick<TokenService, 'issueTokenPair' | 'verifyAccessToken' | 'verifyRefreshToken' | 'fingerprint'>
  >;
  let sessions: jest.Mocked<Pick<SessionService, 'create' | 'find' | 'rotate' | 'revoke'>>;
  let service: AuthService;

  beforeEach(() => {
    identities = {
      findByIdentifier: jest.fn(),
      findById: jest.fn(),
      createPasswordIdentity: jest.fn(),
      activate: jest.fn(),
      recordSuccessfulLogin: jest.fn(),
    };
    users = { createUser: jest.fn() };
    passwords = { hash: jest.fn(), verify: jest.fn() };
    tokens = {
      issueTokenPair: jest.fn(),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
      fingerprint: jest.fn((token) => `fingerprint:${token}`),
    };
    sessions = {
      create: jest.fn(),
      find: jest.fn(),
      rotate: jest.fn(),
      revoke: jest.fn(),
    };

    service = new AuthService(
      identities as unknown as IdentityRepository,
      users as unknown as UserClient,
      passwords,
      tokens as unknown as TokenService,
      sessions as unknown as SessionService,
      new AuthMapper(),
    );
  });

  it('creates a local identity, creates the domain user and activates the identity', async () => {
    identities.findByIdentifier.mockResolvedValue(null);
    passwords.hash.mockResolvedValue('password-hash');
    identities.createPasswordIdentity.mockResolvedValue(pendingIdentity);
    users.createUser.mockResolvedValue(true);
    identities.activate.mockResolvedValue(activeIdentity);
    tokens.issueTokenPair.mockResolvedValue(tokenPair);
    sessions.create.mockResolvedValue();

    const result = await service.register({ ...registration, email: '  User@Example.com ' });

    expect(identities.createPasswordIdentity).toHaveBeenCalledWith(
      { email: 'user@example.com', phoneNumber: null },
      'password-hash',
    );
    expect(users.createUser).toHaveBeenCalledWith({
      user_id: userId,
      first_name: 'Ivan',
      last_name: 'Petrov',
      email: 'user@example.com',
      phone_number: undefined,
    });
    expect(identities.activate).toHaveBeenCalledWith(userId);
    expect(result.subject).toEqual({
      id: userId,
      email: activeIdentity.email,
      phoneNumber: null,
      roles: ['applicant'],
      isActive: true,
    });
  });

  it('registers with a phone number and seeds it as the initial contact', async () => {
    const phoneIdentity: IdentityRecord = { ...pendingIdentity, email: null, phoneNumber: '+79991234567' };
    const activePhoneIdentity: IdentityRecord = { ...phoneIdentity, status: 'ACTIVE' };
    identities.findByIdentifier.mockResolvedValue(null);
    passwords.hash.mockResolvedValue('password-hash');
    identities.createPasswordIdentity.mockResolvedValue(phoneIdentity);
    users.createUser.mockResolvedValue(true);
    identities.activate.mockResolvedValue(activePhoneIdentity);
    tokens.issueTokenPair.mockResolvedValue(tokenPair);
    sessions.create.mockResolvedValue();

    await service.register({
      phone_number: '+79991234567',
      password: 'strong-password',
      first_name: 'Ivan',
      last_name: 'Petrov',
    });

    expect(identities.createPasswordIdentity).toHaveBeenCalledWith(
      { email: null, phoneNumber: '+79991234567' },
      'password-hash',
    );
    expect(users.createUser).toHaveBeenCalledWith(expect.objectContaining({ phone_number: '+79991234567' }));
  });

  it('resumes creation of a pending identity with the same password', async () => {
    identities.findByIdentifier.mockResolvedValue(pendingIdentity);
    passwords.verify.mockResolvedValue(true);
    users.createUser.mockResolvedValue(false);
    identities.activate.mockResolvedValue(activeIdentity);
    tokens.issueTokenPair.mockResolvedValue(tokenPair);
    sessions.create.mockResolvedValue();

    await expect(service.register(registration)).resolves.toMatchObject({
      subject: { id: userId, isActive: true },
    });
    expect(passwords.hash).not.toHaveBeenCalled();
    expect(users.createUser).toHaveBeenCalledWith(expect.objectContaining({ user_id: userId }));
  });

  it('leaves a concurrent unique constraint failure for the global Prisma filter', async () => {
    identities.findByIdentifier.mockResolvedValue(null);
    passwords.hash.mockResolvedValue('password-hash');
    const databaseError = new Prisma.PrismaClientKnownRequestError('unique constraint details', {
      code: 'P2002',
      clientVersion: '7.9.1',
    });
    identities.createPasswordIdentity.mockRejectedValue(databaseError);

    await expect(service.register(registration)).rejects.toBe(databaseError);
    expect(identities.findByIdentifier).toHaveBeenCalledTimes(1);
    expect(users.createUser).not.toHaveBeenCalled();
  });

  it('does not let another password take over a pending identity', async () => {
    identities.findByIdentifier.mockResolvedValue(pendingIdentity);
    passwords.verify.mockResolvedValue(false);

    await expect(service.register({ ...registration, password: 'another-password' })).rejects.toMatchObject({
      kind: 'identifier_already_exists',
    });
    expect(users.createUser).not.toHaveBeenCalled();
  });

  it('rejects registration when an active identity already exists', async () => {
    identities.findByIdentifier.mockResolvedValue(activeIdentity);

    await expect(service.register(registration)).rejects.toMatchObject({
      kind: 'identifier_already_exists',
    });
    expect(passwords.verify).not.toHaveBeenCalled();
  });

  it('leaves the identity pending when user creation is unavailable', async () => {
    identities.findByIdentifier.mockResolvedValue(null);
    passwords.hash.mockResolvedValue('password-hash');
    identities.createPasswordIdentity.mockResolvedValue(pendingIdentity);
    users.createUser.mockRejectedValue(AuthApplicationError.unavailable(new Error('user_service unavailable')));

    await expect(service.register(registration)).rejects.toMatchObject({
      kind: 'unavailable',
    });
    expect(identities.activate).not.toHaveBeenCalled();
  });

  it('logs in from auth-owned credentials and records login time', async () => {
    identities.findByIdentifier.mockResolvedValue(activeIdentity);
    passwords.verify.mockResolvedValue(true);
    identities.recordSuccessfulLogin.mockResolvedValue();
    tokens.issueTokenPair.mockResolvedValue(tokenPair);
    sessions.create.mockResolvedValue();

    const result = await service.login({ email: activeIdentity.email, password: 'strong-password' });

    expect(passwords.verify).toHaveBeenCalledWith('strong-password', 'password-hash');
    expect(identities.recordSuccessfulLogin).toHaveBeenCalledWith(userId);
    expect(result.tokens).toEqual(tokenPair);
  });

  it('does not reveal whether a login identity exists', async () => {
    identities.findByIdentifier.mockResolvedValue(null);

    await expect(service.login({ email: 'missing@example.com', password: 'strong-password' })).rejects.toMatchObject({
      kind: 'invalid_credentials',
    });
    expect(passwords.verify).not.toHaveBeenCalled();
  });

  it('leaves known Prisma errors for the global exception filter', async () => {
    const databaseError = new Prisma.PrismaClientKnownRequestError('record details', {
      code: 'P2025',
      clientVersion: '7.9.1',
    });
    identities.findByIdentifier.mockRejectedValue(databaseError);

    await expect(service.login({ email: activeIdentity.email ?? undefined, password: 'strong-password' })).rejects.toBe(
      databaseError,
    );
  });

  it('rotates a refresh token only for an active identity', async () => {
    tokens.verifyRefreshToken.mockResolvedValue({ userId, sessionId: 'session-id' });
    identities.findById.mockResolvedValue(activeIdentity);
    tokens.issueTokenPair.mockResolvedValue(tokenPair);
    sessions.rotate.mockResolvedValue(true);

    await expect(service.refreshToken('old-refresh-token')).resolves.toEqual(tokenPair);
    expect(sessions.rotate).toHaveBeenCalledWith({
      sessionId: 'session-id',
      userId,
      expectedRefreshTokenFingerprint: 'fingerprint:old-refresh-token',
      nextRefreshTokenFingerprint: 'fingerprint:refresh-token',
      ttlSeconds: tokenPair.refreshTokenExpiresInSeconds,
    });
  });

  it('rejects a replayed refresh token when rotation loses the compare-and-set', async () => {
    tokens.verifyRefreshToken.mockResolvedValue({ userId, sessionId: 'session-id' });
    identities.findById.mockResolvedValue(activeIdentity);
    tokens.issueTokenPair.mockResolvedValue(tokenPair);
    sessions.rotate.mockResolvedValue(false);

    await expect(service.refreshToken('old-refresh-token')).rejects.toMatchObject({ kind: 'invalid_token' });
  });

  it('validates an access token only while its session and identity are active', async () => {
    const principal = { userId, sessionId: 'session-id', roles: ['applicant'] };
    tokens.verifyAccessToken.mockResolvedValue(principal);
    sessions.find.mockResolvedValue({ userId, refreshTokenFingerprint: 'fingerprint:refresh-token' });
    identities.findById.mockResolvedValue({ ...activeIdentity, roles: ['applicant', 'admin'] });

    await expect(service.validateAccessToken('access-token')).resolves.toEqual({
      ...principal,
      roles: ['applicant', 'admin'],
    });

    sessions.find.mockResolvedValue(null);
    await expect(service.validateAccessToken('access-token')).rejects.toMatchObject({ kind: 'invalid_token' });
  });

  it('revokes a session using the presented refresh token', async () => {
    tokens.verifyRefreshToken.mockResolvedValue({ userId, sessionId: 'session-id' });
    sessions.revoke.mockResolvedValue(true);

    await expect(service.logout('refresh-token')).resolves.toBe(true);
    expect(sessions.revoke).toHaveBeenCalledWith({
      sessionId: 'session-id',
      userId,
      refreshTokenFingerprint: 'fingerprint:refresh-token',
    });
  });
});
