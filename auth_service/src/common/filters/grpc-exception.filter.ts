import { ArgumentsHost, Catch, RpcExceptionFilter } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { AuthErrorMapper } from '../mappers/auth-error.mapper';

@Catch()
export class GrpcExceptionFilter implements RpcExceptionFilter<unknown> {
  constructor(private readonly mapper: AuthErrorMapper) {}

  catch(error: unknown, host: ArgumentsHost): Observable<never> {
    void host;
    return throwError(() => this.mapper.toGrpc(error));
  }
}
