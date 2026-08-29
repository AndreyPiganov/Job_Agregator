import { status } from '@grpc/grpc-js';
import { AuthApplicationError } from '../errors/auth-application.error';
import { AuthErrorMapper } from './auth-error.mapper';

describe('AuthErrorMapper', () => {
  const mapper = new AuthErrorMapper();

  it('maps domain errors to the expected gRPC status', () => {
    const result = mapper.toGrpc(new AuthApplicationError('invalid_credentials', 'email or password is incorrect'));
    expect(result).toMatchObject({ code: status.UNAUTHENTICATED, details: 'email or password is incorrect' });
  });

  it('does not expose unexpected error details', () => {
    const result = mapper.toGrpc(new Error('database password leaked'));
    expect(result).toMatchObject({ code: status.INTERNAL, details: 'internal authentication service error' });
  });
});
