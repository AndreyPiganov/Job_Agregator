import { Request } from 'express';
import { AuthUser, TokenPair } from '../../../generated/auth/v1/auth';

export interface AuthSession {
  user: AuthUser;
  tokens: TokenPair;
}

export interface AuthPrincipal {
  user_id: string;
  session_id: string;
  roles: string[];
}

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  roles: string[];
  typ: 'access';
}

export type AuthenticatedRequest<T> = Request & { user: T };

export interface AuthIdentifierObject {
  email?: unknown;
  phone_number?: unknown;
}
