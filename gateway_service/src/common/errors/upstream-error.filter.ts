import {
  ArgumentsHost,
  BadGatewayException,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  ForbiddenException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Response } from 'express';
import { UpstreamServiceError } from './upstream-service.error';

@Catch(UpstreamServiceError)
export class UpstreamErrorFilter implements ExceptionFilter<UpstreamServiceError> {
  catch(error: UpstreamServiceError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpError = upstreamErrorToHttp(error);
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }
}

export function upstreamErrorToHttp(error: UpstreamServiceError): HttpException {
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
