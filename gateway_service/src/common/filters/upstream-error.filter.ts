import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { UpstreamServiceError } from '../errors/upstream-service.error';
import { UpstreamErrorMapper } from '../mappers/upstream-error.mapper';

@Catch(UpstreamServiceError)
export class UpstreamErrorFilter implements ExceptionFilter<UpstreamServiceError> {
  constructor(private readonly mapper: UpstreamErrorMapper) {}

  catch(error: UpstreamServiceError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpError = this.mapper.toHttp(error);
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }
}
