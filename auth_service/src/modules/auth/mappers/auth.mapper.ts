import { Injectable } from '@nestjs/common';
import {
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  TokenPair as GrpcTokenPair,
  ValidateAccessTokenResponse,
} from '../../../generated/auth/v1/auth';
import type {
  AuthPrincipal,
  AuthSession,
  AuthSubject,
  IdentityRecord,
  LoginIdentifier,
  RegistrationData,
  TokenPair,
} from '../interfaces/auth.interfaces';

@Injectable()
export class AuthMapper {
  registrationFromGrpc(request: RegisterRequest): RegistrationData {
    return {
      identifier: identifier(request.email, request.phone_number),
      firstName: canonicalizeName(request.first_name),
      lastName: canonicalizeName(request.last_name),
      password: request.password,
    };
  }

  loginIdentifierFromGrpc(request: LoginRequest): LoginIdentifier {
    return identifier(request.email, request.phone_number);
  }

  sessionToGrpc(session: AuthSession): RegisterResponse {
    return {
      user: {
        id: session.subject.id,
        email: session.subject.email ?? undefined,
        roles: session.subject.roles,
        phone_number: session.subject.phoneNumber ?? undefined,
      },
      tokens: this.tokenPairToGrpc(session.tokens),
    };
  }

  tokenPairToGrpc(tokens: TokenPair): GrpcTokenPair {
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      access_token_expires_in_seconds: String(tokens.accessTokenExpiresInSeconds),
      refresh_token_expires_in_seconds: String(tokens.refreshTokenExpiresInSeconds),
    };
  }

  principalToGrpc(principal: AuthPrincipal): ValidateAccessTokenResponse {
    return {
      user_id: principal.userId,
      session_id: principal.sessionId,
      roles: principal.roles,
    };
  }

  identityToSubject(identity: IdentityRecord): AuthSubject {
    return {
      id: identity.id,
      email: identity.email,
      phoneNumber: identity.phoneNumber,
      roles: [...identity.roles],
      isActive: identity.status === 'ACTIVE',
    };
  }
}

function identifier(emailValue?: string, phoneValue?: string): LoginIdentifier {
  return {
    email: emailValue?.trim().toLowerCase() || null,
    phoneNumber: phoneValue?.trim() || null,
  };
}

function canonicalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
