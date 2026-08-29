import { firstValueFrom, Observable, timeout } from 'rxjs';

export type AsyncUnaryGrpcClient<Client> = {
  [Method in keyof Client]: Client[Method] extends (...args: infer Args) => Observable<infer Response>
    ? (...args: Args) => Promise<Response>
    : Client[Method];
};

interface UnaryGrpcClientProxyOptions {
  timeoutMs: number;
  mapError?: (error: unknown) => unknown;
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
          throw options.mapError?.(error) ?? error;
        }
      };
      wrappedMethods.set(property, wrapped);
      return wrapped;
    },
  }) as AsyncUnaryGrpcClient<Client>;
}
