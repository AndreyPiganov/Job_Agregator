import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { DatabaseModule } from '../../common/database/database.module';
import { GrpcExceptionFilter } from '../../common/filters/grpc-exception.filter';
import { PrismaGrpcExceptionFilter } from '../../common/filters/prisma-grpc-exception.filter';
import { GrpcLoggingInterceptor } from '../../common/interceptors/grpc-logging.interceptor';
import { GrpcValidationInterceptor } from '../../common/interceptors/grpc-validation.interceptor';
import { AuthErrorMapper } from '../../common/mappers/auth-error.mapper';
import { PrismaErrorMapper } from '../../common/mappers/prisma-error.mapper';
import configuration from '../../config/configuration';
import { validateEnvironment } from '../../config/environment.validation';
import { createWinstonConfig } from '../../config/winston.config';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createWinstonConfig,
    }),
    DatabaseModule,
    AuthModule,
  ],
  providers: [
    AuthErrorMapper,
    PrismaErrorMapper,
    // Nest evaluates global filters in reverse registration order, so the
    // specialized Prisma filter must be registered after the catch-all filter.
    { provide: APP_FILTER, useClass: GrpcExceptionFilter },
    { provide: APP_FILTER, useClass: PrismaGrpcExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: GrpcLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: GrpcValidationInterceptor },
  ],
})
export class AppModule {}
