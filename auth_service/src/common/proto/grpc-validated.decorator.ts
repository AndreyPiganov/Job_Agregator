import { DescService } from '@bufbuild/protobuf';
import { SetMetadata } from '@nestjs/common';

export const GRPC_VALIDATION_SERVICE = Symbol('grpc-validation-service');

export const GrpcValidated = (service: DescService) => SetMetadata(GRPC_VALIDATION_SERVICE, service);
