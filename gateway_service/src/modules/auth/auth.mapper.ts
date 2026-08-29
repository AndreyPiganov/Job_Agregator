import { Injectable } from '@nestjs/common';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  TokenPair,
} from '../../generated/auth/v1/auth';
import { UpstreamServiceError } from '../../common/errors/upstream-service.error';
import { PHONE_PATTERN } from './constants/auth.constants';
import { RegisterDto } from './dto/register.dto';
import type { AuthSession } from './interfaces/auth.interfaces';

@Injectable()
export class AuthMapper {
  registerToGrpc(request: RegisterDto): RegisterRequest {
    return {
      email: request.email,
      phone_number: request.phone_number,
      password: request.password,
      first_name: request.first_name,
      last_name: request.last_name,
    };
  }

  loginToGrpc(identifier: string, password: string): LoginRequest {
    const canonicalIdentifier = identifier.trim();
    return PHONE_PATTERN.test(canonicalIdentifier)
      ? { phone_number: canonicalIdentifier, password }
      : { email: canonicalIdentifier, password };
  }

  sessionFromGrpc(response: RegisterResponse | LoginResponse): AuthSession {
    if (!response.user || !response.tokens) {
      throw invalidResponse('auth service returned an incomplete session');
    }
    return { user: response.user, tokens: response.tokens };
  }

  tokenPairFromGrpc(tokens: TokenPair | undefined): TokenPair {
    if (!tokens) {
      throw invalidResponse('auth service returned an empty token pair');
    }
    return tokens;
  }
}

function invalidResponse(message: string): UpstreamServiceError {
  return new UpstreamServiceError('auth service', 'invalid_response', message);
}
