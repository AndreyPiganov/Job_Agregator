import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { developmentAccessPublicKeyBase64 } from '../../../config/jwt.constants';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const strategy = new JwtStrategy(
    new ConfigService({
      jwt: {
        accessPublicKey: Buffer.from(developmentAccessPublicKeyBase64, 'base64').toString('utf8'),
        issuer: 'test-auth',
        audience: 'test-services',
      },
    }),
  );

  it('maps a verified access payload to the HTTP principal', () => {
    expect(strategy.validate({ sub: 'user-id', sid: 'session-id', roles: ['applicant'], typ: 'access' })).toEqual({
      user_id: 'user-id',
      session_id: 'session-id',
      roles: ['applicant'],
    });
  });

  it('rejects a payload intended for refresh', () => {
    expect(() => strategy.validate({ sub: 'user-id', sid: 'session-id', typ: 'refresh' })).toThrow(
      UnauthorizedException,
    );
  });
});
