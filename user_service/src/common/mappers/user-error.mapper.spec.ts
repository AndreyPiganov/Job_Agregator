import { status } from '@grpc/grpc-js';
import { UserApplicationError } from '../errors/user-application.error';
import { UserErrorMapper } from './user-error.mapper';

describe('UserErrorMapper', () => {
  const mapper = new UserErrorMapper();

  it('maps application errors to their public gRPC status', () => {
    expect(mapper.toGrpc(UserApplicationError.notFound('education'))).toMatchObject({
      code: status.NOT_FOUND,
      details: 'education was not found',
    });
  });

  it('maps unexpected errors to a safe internal response', () => {
    expect(mapper.toGrpc(new Error('unexpected implementation details'))).toMatchObject({
      code: status.INTERNAL,
      details: 'internal user service error',
    });
  });
});
