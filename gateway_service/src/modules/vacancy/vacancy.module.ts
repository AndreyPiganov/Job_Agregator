import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, GrpcOptions, Transport } from '@nestjs/microservices';
import { RedisCacheModule } from '../../common/cache/redis-cache.module';
import { grpcPackageDefinition } from '../../common/grpc/contracts';
import { JOBAGGREGATOR_VACANCY_V1_PACKAGE_NAME } from '../../generated/vacancy/v1/vacancy';
import { VacancyController } from './vacancy.controller';
import { VacancyMapper } from './vacancy.mapper';
import { VacancyService } from './vacancy.service';

@Module({
  imports: [
    RedisCacheModule,
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        inject: [ConfigService],
        name: JOBAGGREGATOR_VACANCY_V1_PACKAGE_NAME,
        useFactory: (config: ConfigService): GrpcOptions => ({
          transport: Transport.GRPC,
          options: {
            package: JOBAGGREGATOR_VACANCY_V1_PACKAGE_NAME,
            packageDefinition: grpcPackageDefinition,
            url: config.get<string>('grpc.vacancy.url', 'localhost:50051'),
          },
        }),
      },
    ]),
  ],
  controllers: [VacancyController],
  providers: [VacancyService, VacancyMapper],
})
export class VacancyModule {}
