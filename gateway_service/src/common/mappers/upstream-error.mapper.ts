import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UpstreamServiceError } from '../errors/upstream-service.error';

@Injectable()
export class UpstreamErrorMapper {
  toHttp(error: UpstreamServiceError): HttpException {
    switch (error.kind) {
      case 'invalid_argument':
        return new BadRequestException(error.message);
      case 'not_found':
        return new NotFoundException(error.message);
      case 'already_exists':
        return new ConflictException(error.message);
      case 'permission_denied':
        return new ForbiddenException(error.message);
      case 'unauthenticated':
        return new UnauthorizedException(error.message);
      case 'resource_exhausted':
        return new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS);
      case 'failed_precondition':
        return new UnprocessableEntityException(error.message);
      case 'unavailable':
        return new ServiceUnavailableException(error.message);
      case 'deadline_exceeded':
        return new GatewayTimeoutException(error.message);
      case 'invalid_response':
      case 'unknown':
        return new BadGatewayException(error.message);
    }
  }
}
