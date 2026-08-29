import { status } from '@grpc/grpc-js';
import { CallHandler, ExecutionContext, Inject, Injectable, LoggerService, NestInterceptor } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Observable, tap } from 'rxjs';
import { isPrismaKnownRequestError } from '../database/prisma-error';
import { AuthErrorMapper } from '../mappers/auth-error.mapper';
import { PrismaErrorMapper } from '../mappers/prisma-error.mapper';

@Injectable()
export class GrpcLoggingInterceptor implements NestInterceptor<unknown, unknown> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly authErrors: AuthErrorMapper,
    private readonly prismaErrors: PrismaErrorMapper,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    if (context.getType() !== 'rpc') {
      return next.handle();
    }

    const startedAt = Date.now();
    const service = context.getClass().name;
    const method = context.getHandler().name;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log({
            message: 'grpc request completed',
            service,
            method,
            code: 'OK',
            durationMs: Date.now() - startedAt,
          });
        },
        error: (error: unknown) => {
          const grpcError = isPrismaKnownRequestError(error)
            ? this.prismaErrors.toGrpc(error)
            : this.authErrors.toGrpc(error);
          const payload = {
            message: 'grpc request failed',
            service,
            method,
            code: status[grpcError.code],
            durationMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : error,
          };

          if (isExpectedGrpcError(grpcError.code)) {
            this.logger.warn(payload);
            return;
          }

          this.logger.error({
            ...payload,
            stack: error instanceof Error ? error.stack : undefined,
          });
        },
      }),
    );
  }
}

function isExpectedGrpcError(code: status): boolean {
  return [
    status.INVALID_ARGUMENT,
    status.NOT_FOUND,
    status.ALREADY_EXISTS,
    status.PERMISSION_DENIED,
    status.UNAUTHENTICATED,
    status.RESOURCE_EXHAUSTED,
    status.FAILED_PRECONDITION,
    status.CANCELLED,
    status.DEADLINE_EXCEEDED,
    status.UNIMPLEMENTED,
  ].includes(code);
}
