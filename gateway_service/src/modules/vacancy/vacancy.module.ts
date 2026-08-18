import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, GrpcOptions, Transport } from '@nestjs/microservices';
import { loadFileDescriptorSetFromBuffer } from '@grpc/proto-loader';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JOBAGGREGATOR_VACANCY_V1_PACKAGE_NAME } from '../../generated/vacancy/v1/vacancy';
import { VacancyController } from './vacancy.controller';
import { VacancyService } from './vacancy.service';

const packageDefinition = loadFileDescriptorSetFromBuffer(
  readFileSync(join(__dirname, '../../generated/contracts.binpb')),
  {
    arrays: true,
    defaults: true,
    longs: String,
  },
);

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        inject: [ConfigService],
        name: JOBAGGREGATOR_VACANCY_V1_PACKAGE_NAME,
        useFactory: (config: ConfigService): GrpcOptions => ({
          transport: Transport.GRPC,
          options: {
            package: JOBAGGREGATOR_VACANCY_V1_PACKAGE_NAME,
            packageDefinition,
            url: config.get<string>('grpc.vacancy.url', 'localhost:50051'),
          },
        }),
      },
    ]),
  ],
  controllers: [VacancyController],
  providers: [VacancyService],
})
export class VacancyModule {}
