import { firstValueFrom, Observable, timeout, TimeoutError } from 'rxjs';
import { UpstreamServiceError } from '../errors/upstream-service.error';
import { GrpcErrorMapper } from '../mappers/grpc-error.mapper';

export type AsyncUnaryGrpcClient<Client> = {
  [Method in keyof Client]: Client[Method] extends (...args: infer Args) => Observable<infer Response>
    ? (...args: Args) => Promise<Response>
    : Client[Method];
};

interface UnaryGrpcClientProxyOptions {
  service: string;
  timeoutMs: number;
  errors: GrpcErrorMapper;
}

export function createUnaryGrpcClientProxy<Client extends object>(
  client: Client,
  options: UnaryGrpcClientProxyOptions,
): AsyncUnaryGrpcClient<Client> {
  const wrappedMethods = new Map<PropertyKey, (...args: unknown[]) => Promise<unknown>>();

  return new Proxy(client, {
    get(target, property, receiver): unknown {
      const value: unknown = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') return value;

      const existing = wrappedMethods.get(property);
      if (existing) return existing;

      const wrapped = async (...args: unknown[]): Promise<unknown> => {
        try {
          const response = Reflect.apply(value, target, args) as Observable<unknown>;
          return await firstValueFrom(response.pipe(timeout(options.timeoutMs)));
        } catch (error) {
          if (error instanceof TimeoutError) {
            throw new UpstreamServiceError(
              options.service,
              'deadline_exceeded',
              `${options.service} request timed out`,
              { cause: error },
            );
          }
          throw options.errors.toUpstream(error, options.service);
        }
      };
      wrappedMethods.set(property, wrapped);
      return wrapped;
    },
  }) as AsyncUnaryGrpcClient<Client>;
}
