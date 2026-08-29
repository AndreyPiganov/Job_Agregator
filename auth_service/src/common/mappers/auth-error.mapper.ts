import { status } from '@grpc/grpc-js';
import { Injectable } from '@nestjs/common';
import { AuthApplicationError } from '../errors/auth-application.error';
import { GrpcServiceError } from '../errors/grpc-service.error';

@Injectable()
export class AuthErrorMapper {
  toGrpc(error: unknown): GrpcServiceError {
    if (!(error instanceof AuthApplicationError)) {
      return new GrpcServiceError(status.INTERNAL, 'internal authentication service error');
    }

    switch (error.kind) {
      case 'invalid_argument':
        return new GrpcServiceError(status.INVALID_ARGUMENT, error.message);
      case 'invalid_credentials':
      case 'invalid_token':
        return new GrpcServiceError(status.UNAUTHENTICATED, error.message);
      case 'identifier_already_exists':
        return new GrpcServiceError(status.ALREADY_EXISTS, error.message);
      case 'session_not_found':
        return new GrpcServiceError(status.NOT_FOUND, error.message);
      case 'permission_denied':
        return new GrpcServiceError(status.PERMISSION_DENIED, error.message);
      case 'resource_exhausted':
        return new GrpcServiceError(status.RESOURCE_EXHAUSTED, error.message);
      case 'unavailable':
        return new GrpcServiceError(status.UNAVAILABLE, error.message);
      case 'not_implemented':
        return new GrpcServiceError(status.UNIMPLEMENTED, error.message);
    }
  }
}
