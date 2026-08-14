import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { LoggingInterceptor } from '../../common/interceptors/LoggingInterceptor';
import configuration from '../../config/configuration';
import { winstonConfig } from '../../config/winston.config';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration]
        }),
        WinstonModule.forRoot({
            transports: winstonConfig.transports,
            format: winstonConfig.format,
            level: winstonConfig.level
        })
    ],
    providers: [Reflector, { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }]
})
export class AppModule {}