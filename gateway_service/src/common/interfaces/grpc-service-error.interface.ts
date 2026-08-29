import { status } from '@grpc/grpc-js';

export interface GrpcServiceError {
  code: status;
  details?: string;
}
