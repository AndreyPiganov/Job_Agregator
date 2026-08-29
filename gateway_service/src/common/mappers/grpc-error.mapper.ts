import { status } from '@grpc/grpc-js';
import { Injectable } from '@nestjs/common';
import { UpstreamServiceError } from '../errors/upstream-service.error';
import type { GrpcServiceError } from '../interfaces/grpc-service-error.interface';

@Injectable()
export class GrpcErrorMapper {
  toUpstream(error: unknown, service: string): UpstreamServiceError {
    if (error instanceof UpstreamServiceError) {
      return error;
    }

    if (!isGrpcServiceError(error)) {
      return upstreamError(service, 'unknown', `${service} request failed`, error);
    }

    const message = error.details?.trim() || `${service} request failed`;
    switch (error.code) {
      case status.INVALID_ARGUMENT:
      case status.OUT_OF_RANGE:
        return upstreamError(service, 'invalid_argument', message, error);
      case status.NOT_FOUND:
        return upstreamError(service, 'not_found', message, error);
      case status.ALREADY_EXISTS:
        return upstreamError(service, 'already_exists', message, error);
      case status.PERMISSION_DENIED:
        return upstreamError(service, 'permission_denied', message, error);
      case status.UNAUTHENTICATED:
        return upstreamError(service, 'unauthenticated', message, error);
      case status.RESOURCE_EXHAUSTED:
        return upstreamError(service, 'resource_exhausted', message, error);
      case status.FAILED_PRECONDITION:
        return upstreamError(service, 'failed_precondition', message, error);
      case status.UNAVAILABLE:
        return upstreamError(service, 'unavailable', `${service} is unavailable`, error);
      case status.DEADLINE_EXCEEDED:
        return upstreamError(service, 'deadline_exceeded', `${service} request timed out`, error);
      default:
        return upstreamError(service, 'unknown', `${service} request failed`, error);
    }
  }
}

function upstreamError(
  service: string,
  kind: UpstreamServiceError['kind'],
  message: string,
  cause: unknown,
): UpstreamServiceError {
  return new UpstreamServiceError(service, kind, message, { cause });
}

function isGrpcServiceError(error: unknown): error is GrpcServiceError {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'number';
}
