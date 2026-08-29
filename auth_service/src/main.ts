import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { grpcPackageDefinition } from './common/grpc/contracts';
import { AppModule } from './modules/app/app.module';
import { JOBAGGREGATOR_AUTH_V1_PACKAGE_NAME } from './generated/auth/v1/auth';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    bufferLogs: true,
    transport: Transport.GRPC,
    options: {
      package: JOBAGGREGATOR_AUTH_V1_PACKAGE_NAME,
      packageDefinition: grpcPackageDefinition,
      url: `${process.env.GRPC_HOST ?? '0.0.0.0'}:${process.env.GRPC_PORT ?? '5005'}`,
    },
  });

  const logger = app.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  await app.listen();
  logger.log({
    message: 'auth gRPC service started',
    host: config.get<string>('grpc.host', '0.0.0.0'),
    port: config.get<number>('grpc.port', 5005),
  });
}

void bootstrap();
