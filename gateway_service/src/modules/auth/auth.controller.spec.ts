import { GatewayAuthService } from './auth.service';
import { AuthController } from './auth.controller';
import type { AuthSession } from './interfaces/auth.interfaces';

describe('AuthController', () => {
  it('delegates validated login credentials directly to the auth service', async () => {
    const session = {
      user: { id: 'user-id', email: 'user@example.com', roles: ['applicant'] },
      tokens: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        access_token_expires_in_seconds: '900',
        refresh_token_expires_in_seconds: '2592000',
      },
    } satisfies AuthSession;
    const login = jest.fn().mockResolvedValue(session);
    const auth = { login } as unknown as GatewayAuthService;
    const controller = new AuthController(auth);

    await expect(controller.login({ identifier: 'user@example.com', password: 'password' })).resolves.toBe(session);
    expect(login).toHaveBeenCalledWith('user@example.com', 'password');
  });
});
