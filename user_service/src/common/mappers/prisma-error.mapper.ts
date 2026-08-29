import { status } from '@grpc/grpc-js';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { GrpcServiceError } from '../errors/grpc-service.error';

@Injectable()
export class PrismaErrorMapper {
  toGrpc(exception: Pick<Prisma.PrismaClientKnownRequestError, 'code'>): GrpcServiceError {
    switch (exception.code) {
      case 'P2000':
        return new GrpcServiceError(status.INVALID_ARGUMENT, 'value is too long');
      case 'P2002':
        return new GrpcServiceError(status.ALREADY_EXISTS, 'unique constraint was violated');
      case 'P2003':
        return new GrpcServiceError(status.FAILED_PRECONDITION, 'referenced resource does not exist');
      case 'P2025':
        return new GrpcServiceError(status.NOT_FOUND, 'resource was not found');
      default:
        return new GrpcServiceError(status.INTERNAL, 'internal database error');
    }
  }
}
