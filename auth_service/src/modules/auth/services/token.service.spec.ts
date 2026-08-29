import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createPublicKey } from 'node:crypto';
import { developmentAccessPrivateKeyBase64 } from '../../../config/jwt.constants';
import { TokenService } from './token.service';

describe('TokenService', () => {
  const accessPrivateKey = Buffer.from(developmentAccessPrivateKeyBase64, 'base64').toString('utf8');
  const accessPublicKey = createPublicKey(accessPrivateKey).export({ type: 'spki', format: 'pem' }).toString();
  const service = new TokenService(
    new JwtService(),
    new ConfigService({
      jwt: {
        accessPrivateKey,
        accessPublicKey,
        refreshSecret: 'refresh-secret-that-is-long-enough-for-tests',
        accessTtlSeconds: 900,
        refreshTtlSeconds: 2_592_000,
        issuer: 'test-auth',
        audience: 'test-services',
      },
    }),
  );

  it('issues purpose-specific access and refresh tokens', async () => {
    const tokens = await service.issueTokenPair(
      { id: 'user-id', email: 'user@example.com', phoneNumber: null, roles: ['user'], isActive: true },
      'session-id',
    );

    await expect(service.verifyAccessToken(tokens.accessToken)).resolves.toEqual({
      userId: 'user-id',
      sessionId: 'session-id',
      roles: ['user'],
    });
    await expect(service.verifyRefreshToken(tokens.refreshToken)).resolves.toEqual({
      userId: 'user-id',
      sessionId: 'session-id',
    });
    await expect(service.verifyAccessToken(tokens.refreshToken)).resolves.toBeNull();
    await expect(service.verifyRefreshToken(tokens.accessToken)).resolves.toBeNull();

    const accessHeader = JSON.parse(Buffer.from(tokens.accessToken.split('.')[0], 'base64url').toString('utf8')) as {
      alg: string;
    };
    const refreshHeader = JSON.parse(Buffer.from(tokens.refreshToken.split('.')[0], 'base64url').toString('utf8')) as {
      alg: string;
    };
    expect(accessHeader.alg).toBe('RS256');
    expect(refreshHeader.alg).toBe('HS256');
  });

  it('creates a stable non-reversible token fingerprint', () => {
    expect(service.fingerprint('refresh-token')).toMatch(/^[a-f0-9]{64}$/);
    expect(service.fingerprint('refresh-token')).toBe(service.fingerprint('refresh-token'));
    expect(service.fingerprint('refresh-token')).not.toContain('refresh-token');
  });
});
