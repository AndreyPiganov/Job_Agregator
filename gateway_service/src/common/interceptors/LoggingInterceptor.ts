import { CallHandler, ExecutionContext, Inject, Injectable, LoggerService, NestInterceptor } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Observable, tap } from 'rxjs';

interface HttpRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
}

interface HttpResponse {
  statusCode?: number;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor<unknown, unknown> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    const startedAt = Date.now();

    if (context.getType() === 'http') {
      return this.logHttp(context, next, startedAt);
    }

    if (context.getType() === 'rpc') {
      return this.logRpc(context, next, startedAt);
    }

    return next.handle();
  }

  private logHttp(context: ExecutionContext, next: CallHandler<unknown>, startedAt: number): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<HttpRequest>();
    const response = http.getResponse<HttpResponse>();
    const method = request.method ?? 'UNKNOWN';
    const path = request.originalUrl ?? request.url ?? 'UNKNOWN';

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log({
            message: 'http request completed',
            method,
            path,
            status: response.statusCode,
            durationMs: Date.now() - startedAt,
          });
        },
        error: (error: unknown) => {
          this.logger.error({
            message: 'http request failed',
            method,
            path,
            durationMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
          });
        },
      }),
    );
  }

  private logRpc(context: ExecutionContext, next: CallHandler<unknown>, startedAt: number): Observable<unknown> {
    const handler = context.getHandler().name;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log({
            message: 'rpc request completed',
            handler,
            durationMs: Date.now() - startedAt,
          });
        },
        error: (error: unknown) => {
          this.logger.error({
            message: 'rpc request failed',
            handler,
            durationMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
          });
        },
      }),
    );
  }
}
