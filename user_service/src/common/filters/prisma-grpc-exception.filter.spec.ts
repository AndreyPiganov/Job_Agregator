import { status } from '@grpc/grpc-js';
import { ArgumentsHost } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '../../generated/prisma/client';
import { PrismaErrorMapper } from '../mappers/prisma-error.mapper';
import { PrismaGrpcExceptionFilter } from './prisma-grpc-exception.filter';

describe('PrismaGrpcExceptionFilter', () => {
  it('emits the mapped gRPC error', async () => {
    const exception = new Prisma.PrismaClientKnownRequestError('database details', {
      code: 'P2002',
      clientVersion: '7.9.1',
    });
    const filter = new PrismaGrpcExceptionFilter(new PrismaErrorMapper());

    await expect(firstValueFrom(filter.catch(exception, {} as ArgumentsHost))).rejects.toMatchObject({
      code: status.ALREADY_EXISTS,
      details: 'unique constraint was violated',
    });
  });
});
