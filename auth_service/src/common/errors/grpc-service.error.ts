import { status } from '@grpc/grpc-js';

export class GrpcServiceError extends Error {
  readonly details: string;

  constructor(
    readonly code: status,
    details: string,
  ) {
    super(details);
    this.name = GrpcServiceError.name;
    this.details = details;
  }
}
