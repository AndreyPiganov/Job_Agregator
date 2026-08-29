import { Observable, of, throwError } from 'rxjs';
import { createUnaryGrpcClientProxy } from './unary-grpc-client.proxy';

interface TestGrpcClient {
  getValue(request: { value: string }): Observable<{ value: string }>;
  getLength(request: { value: string }): Observable<{ value: number }>;
}

describe('createUnaryGrpcClientProxy', () => {
  it('converts every unary Observable method to a Promise', async () => {
    const client: TestGrpcClient = {
      getValue: jest.fn((request: { value: string }) => of(request)),
      getLength: jest.fn((request: { value: string }) => of({ value: request.value.length })),
    };
    const proxy = createUnaryGrpcClientProxy(client, { timeoutMs: 100 });

    await expect(proxy.getValue({ value: 'test' })).resolves.toEqual({ value: 'test' });
    await expect(proxy.getLength({ value: 'test' })).resolves.toEqual({ value: 4 });
  });

  it('maps errors in one place', async () => {
    const upstreamError = new Error('upstream failed');
    const mappedError = new Error('mapped upstream failure');
    const client: TestGrpcClient = {
      getValue: jest.fn(() => throwError(() => upstreamError)),
      getLength: jest.fn(() => of({ value: 0 })),
    };
    const proxy = createUnaryGrpcClientProxy(client, {
      timeoutMs: 100,
      mapError: (error) => (error === upstreamError ? mappedError : error),
    });

    await expect(proxy.getValue({ value: 'test' })).rejects.toBe(mappedError);
  });
});
