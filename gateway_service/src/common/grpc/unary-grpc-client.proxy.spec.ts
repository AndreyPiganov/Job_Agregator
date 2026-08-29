import { status } from '@grpc/grpc-js';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { GrpcErrorMapper } from '../mappers/grpc-error.mapper';
import { createUnaryGrpcClientProxy } from './unary-grpc-client.proxy';

interface TestGrpcClient {
  getValue(request: { value: string }): Observable<{ value: string }>;
  fail(request: object): Observable<never>;
}

describe('createUnaryGrpcClientProxy', () => {
  const errors = new GrpcErrorMapper();

  it('converts every unary Observable method to a Promise', async () => {
    const client: TestGrpcClient = {
      getValue: jest.fn((request: { value: string }) => of(request)),
      fail: jest.fn(() => NEVER),
    };
    const proxy = createUnaryGrpcClientProxy(client, {
      service: 'test service',
      timeoutMs: 100,
      errors,
    });

    await expect(proxy.getValue({ value: 'test' })).resolves.toEqual({ value: 'test' });
  });

  it('maps upstream gRPC errors', async () => {
    const client: TestGrpcClient = {
      getValue: jest.fn((request: { value: string }) => of(request)),
      fail: jest.fn(() =>
        throwError(() => Object.assign(new Error('not found'), { code: status.NOT_FOUND, details: 'missing' })),
      ),
    };
    const proxy = createUnaryGrpcClientProxy(client, {
      service: 'test service',
      timeoutMs: 100,
      errors,
    });

    await expect(proxy.fail({})).rejects.toMatchObject({ service: 'test service', kind: 'not_found' });
  });

  it('maps local timeouts', async () => {
    const client: TestGrpcClient = {
      getValue: jest.fn((request: { value: string }) => of(request)),
      fail: jest.fn(() => NEVER),
    };
    const proxy = createUnaryGrpcClientProxy(client, {
      service: 'test service',
      timeoutMs: 1,
      errors,
    });

    await expect(proxy.fail({})).rejects.toMatchObject({
      service: 'test service',
      kind: 'deadline_exceeded',
    });
  });
});
