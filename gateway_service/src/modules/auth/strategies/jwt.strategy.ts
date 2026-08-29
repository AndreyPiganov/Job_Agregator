import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AccessTokenPayload, AuthPrincipal } from '../interfaces/auth.interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('jwt.accessPublicKey'),
      algorithms: ['RS256'],
      issuer: config.getOrThrow<string>('jwt.issuer'),
      audience: config.getOrThrow<string>('jwt.audience'),
      ignoreExpiration: false,
    });
  }

  validate(payload: unknown): AuthPrincipal {
    if (!isAccessTokenPayload(payload)) {
      throw new UnauthorizedException('Invalid access token payload');
    }

    return { user_id: payload.sub, session_id: payload.sid, roles: [...payload.roles] };
  }
}

function isAccessTokenPayload(payload: unknown): payload is AccessTokenPayload {
  if (typeof payload !== 'object' || payload === null) return false;

  const candidate = payload as Partial<AccessTokenPayload>;
  return (
    candidate.typ === 'access' &&
    typeof candidate.sub === 'string' &&
    typeof candidate.sid === 'string' &&
    Array.isArray(candidate.roles) &&
    candidate.roles.every((role) => typeof role === 'string')
  );
}
