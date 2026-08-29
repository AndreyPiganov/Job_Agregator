import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { UpstreamErrorsModule } from '../../common/errors/upstream-errors.module';
import { UpstreamErrorFilter } from '../../common/filters/upstream-error.filter';
import { HttpLoggingInterceptor } from '../../common/interceptors/http-logging.interceptor';
import configuration from '../../config/configuration';
import { validateEnvironment } from '../../config/environment.validation';
import { createWinstonConfig } from '../../config/winston.config';
import { VacancyModule } from '../vacancy/vacancy.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
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
    UpstreamErrorsModule,
    AuthModule,
    UserModule,
    VacancyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: UpstreamErrorFilter },
    { provide: APP_INTERCEPTOR, useClass: HttpLoggingInterceptor },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    },
  ],
})
export class AppModule {}
