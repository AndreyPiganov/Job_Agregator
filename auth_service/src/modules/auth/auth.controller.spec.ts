import { AuthController } from './auth.controller';
import { AuthMapper } from './mappers/auth.mapper';
import { AuthService } from './services/auth.service';
import type { AuthPrincipal, AuthSession, TokenPair } from './interfaces/auth.interfaces';

describe('AuthController', () => {
  const session: AuthSession = {
    subject: {
      id: 'user-id',
      email: 'user@example.com',
      phoneNumber: null,
      roles: ['user'],
      isActive: true,
    },
    tokens: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessTokenExpiresInSeconds: 900,
      refreshTokenExpiresInSeconds: 2_592_000,
    },
  };

  const authService: jest.Mocked<
    Pick<AuthService, 'register' | 'login' | 'refreshToken' | 'validateAccessToken' | 'logout'>
  > = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn<Promise<TokenPair>, [string]>(),
    validateAccessToken: jest.fn<Promise<AuthPrincipal>, [string]>(),
    logout: jest.fn<Promise<boolean>, [string]>(),
  };

  const controller = new AuthController(authService as unknown as AuthService, new AuthMapper());

  beforeEach(() => jest.clearAllMocks());

  it('delegates registration and maps the response', async () => {
    authService.register.mockResolvedValue(session);
    const request = {
      email: 'user@example.com',
      password: 'strong-password',
      first_name: 'Ivan',
      last_name: 'Petrov',
    };

    const response = await controller.register(request);

    expect(authService.register).toHaveBeenCalledWith(request);
    expect(response.tokens?.access_token_expires_in_seconds).toBe('900');
    expect(response.user?.email).toBe('user@example.com');
  });

  it('maps an access-token principal to the gRPC response', async () => {
    authService.validateAccessToken.mockResolvedValue({
      userId: 'user-id',
      sessionId: 'session-id',
      roles: ['user'],
    });

    await expect(controller.validateAccessToken({ access_token: 'access-token' })).resolves.toEqual({
      user_id: 'user-id',
      session_id: 'session-id',
      roles: ['user'],
    });
  });

  it('returns whether logout revoked the refresh session', async () => {
    authService.logout.mockResolvedValue(true);

    await expect(controller.logout({ refresh_token: 'refresh-token' })).resolves.toEqual({ revoked: true });
  });
});
