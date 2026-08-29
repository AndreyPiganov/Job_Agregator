import { Global, Module } from '@nestjs/common';
import { GrpcErrorMapper } from '../mappers/grpc-error.mapper';
import { UpstreamErrorMapper } from '../mappers/upstream-error.mapper';

@Global()
@Module({
  providers: [GrpcErrorMapper, UpstreamErrorMapper],
  exports: [GrpcErrorMapper, UpstreamErrorMapper],
})
export class UpstreamErrorsModule {}
