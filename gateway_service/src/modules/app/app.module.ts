import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { LoggingInterceptor } from '../../common/interceptors/LoggingInterceptor';
import configuration from '../../config/configuration';
import { validateEnvironment } from '../../config/environment.validation';
import { createWinstonConfig } from '../../config/winston.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }],
})
export class AppModule {}
