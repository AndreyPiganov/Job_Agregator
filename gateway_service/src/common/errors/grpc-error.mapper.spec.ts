import { status } from '@grpc/grpc-js';
import { grpcErrorToUpstream } from './grpc-error.mapper';

describe('grpcErrorToUpstream', () => {
  it('maps Protovalidate errors to a transport-independent error', () => {
    const error = grpcErrorToUpstream(
      {
        code: status.INVALID_ARGUMENT,
        details: 'title: value must contain at least 1 character(s)',
      },
      'vacancy service',
    );

    expect(error.kind).toBe('invalid_argument');
    expect(error.message).toContain('title');
  });

  it('does not leak connection details for unavailable services', () => {
    const error = grpcErrorToUpstream(
      {
        code: status.UNAVAILABLE,
        details: 'connect ECONNREFUSED 10.0.0.4:50051',
      },
      'vacancy service',
    );

    expect(error.kind).toBe('unavailable');
    expect(error.message).toBe('vacancy service is unavailable');
  });

  it('maps unknown errors without exposing their message', () => {
    const error = grpcErrorToUpstream(new Error('socket failed'), 'vacancy service');

    expect(error.kind).toBe('unknown');
    expect(error.message).toBe('vacancy service request failed');
  });
});
