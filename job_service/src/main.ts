import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    const PORT = configService.get<string>('port') || 5003;
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

    const config = new DocumentBuilder()
        .setTitle('API Vacancy Documentation')
        .setDescription('API')
        .setVersion('1.0')
        .addTag('example')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
    await app.listen(PORT);
}
bootstrap();
