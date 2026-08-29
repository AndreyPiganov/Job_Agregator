import { status } from '@grpc/grpc-js';
import { PrismaErrorMapper } from './prisma-error.mapper';

describe('PrismaErrorMapper', () => {
  const mapper = new PrismaErrorMapper();

  it.each([
    ['P2000', status.INVALID_ARGUMENT, 'value is too long'],
    ['P2002', status.ALREADY_EXISTS, 'unique constraint was violated'],
    ['P2003', status.FAILED_PRECONDITION, 'referenced resource does not exist'],
    ['P2025', status.NOT_FOUND, 'resource was not found'],
    ['P9999', status.INTERNAL, 'internal database error'],
  ])('maps Prisma code %s', (code, expectedStatus, details) => {
    expect(mapper.toGrpc({ code })).toMatchObject({ code: expectedStatus, details });
  });
});
