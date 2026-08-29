import { ArgumentsHost, Catch, RpcExceptionFilter } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { Prisma } from '../../generated/prisma/client';
import { PrismaErrorMapper } from '../mappers/prisma-error.mapper';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaGrpcExceptionFilter implements RpcExceptionFilter<Prisma.PrismaClientKnownRequestError> {
  constructor(private readonly mapper: PrismaErrorMapper) {}

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): Observable<never> {
    void host;
    return throwError(() => this.mapper.toGrpc(exception));
  }
}
