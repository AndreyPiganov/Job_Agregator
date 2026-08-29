import { status } from '@grpc/grpc-js';
import { Injectable } from '@nestjs/common';
import { GrpcServiceError } from '../errors/grpc-service.error';
import { UserApplicationError } from '../errors/user-application.error';

@Injectable()
export class UserErrorMapper {
  toGrpc(error: unknown): GrpcServiceError {
    if (!(error instanceof UserApplicationError)) {
      return new GrpcServiceError(status.INTERNAL, 'internal user service error');
    }

    switch (error.kind) {
      case 'invalid_argument':
        return new GrpcServiceError(status.INVALID_ARGUMENT, error.message);
      case 'not_found':
        return new GrpcServiceError(status.NOT_FOUND, error.message);
      case 'already_exists':
        return new GrpcServiceError(status.ALREADY_EXISTS, error.message);
      case 'failed_precondition':
        return new GrpcServiceError(status.FAILED_PRECONDITION, error.message);
      case 'permission_denied':
        return new GrpcServiceError(status.PERMISSION_DENIED, error.message);
      case 'unavailable':
        return new GrpcServiceError(status.UNAVAILABLE, error.message);
    }
  }
}
