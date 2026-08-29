import type { Prisma } from '../../../generated/prisma/client';
import type { IDENTITY_SELECT } from '../constants/identity.constants';

export interface AuthSubject {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  roles: string[];
  isActive: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresInSeconds: number;
}

export interface AuthSession {
  subject: AuthSubject;
  tokens: TokenPair;
}

export interface AuthPrincipal {
  userId: string;
  sessionId: string;
  roles: string[];
}

export interface RefreshTokenPrincipal {
  userId: string;
  sessionId: string;
}

export type IdentityStatus = 'PENDING' | 'ACTIVE' | 'BLOCKED' | 'DELETED';

export interface IdentityRecord {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  passwordHash: string | null;
  roles: string[];
  status: IdentityStatus;
}

export type IdentitySelection = Prisma.IdentityGetPayload<{ select: typeof IDENTITY_SELECT }>;

export interface LoginIdentifier {
  email: string | null;
  phoneNumber: string | null;
}

export interface RegistrationData {
  identifier: LoginIdentifier;
  firstName: string;
  lastName: string;
  password: string;
}

export interface StoredSession {
  userId: string;
  refreshTokenFingerprint: string;
}

export interface CreateSessionInput extends StoredSession {
  sessionId: string;
  ttlSeconds: number;
}

export interface RotateSessionInput {
  sessionId: string;
  userId: string;
  expectedRefreshTokenFingerprint: string;
  nextRefreshTokenFingerprint: string;
  ttlSeconds: number;
}

export interface RevokeSessionInput {
  sessionId: string;
  userId: string;
  refreshTokenFingerprint: string;
}

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  roles: string[];
  typ: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  typ: 'refresh';
}
