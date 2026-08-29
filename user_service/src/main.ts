import { loadFileDescriptorSetFromBuffer } from '@grpc/proto-loader';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './modules/app/app.module';
import { JOBAGGREGATOR_USER_V1_PACKAGE_NAME } from './generated/user/v1/user';

const packageDefinition = loadFileDescriptorSetFromBuffer(readFileSync(join(__dirname, 'generated/contracts.binpb')), {
  arrays: true,
  defaults: true,
  longs: String,
});

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    bufferLogs: true,
    transport: Transport.GRPC,
    options: {
      package: JOBAGGREGATOR_USER_V1_PACKAGE_NAME,
      packageDefinition,
      url: `${process.env.GRPC_HOST ?? '0.0.0.0'}:${process.env.GRPC_PORT ?? '5000'}`,
    },
  });

  const logger = app.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  await app.listen();
  logger.log({
    message: 'user gRPC service started',
    host: config.get<string>('grpc.host', '0.0.0.0'),
    port: config.get<number>('grpc.port', 5000),
  });
}

void bootstrap();
