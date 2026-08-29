import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, GrpcOptions, Transport } from '@nestjs/microservices';
import { RedisCacheModule } from '../../common/cache/redis-cache.module';
import { grpcPackageDefinition } from '../../common/grpc/contracts';
import { JOBAGGREGATOR_USER_V1_PACKAGE_NAME } from '../../generated/user/v1/user';
import { AuthModule } from '../auth/auth.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './services/profile.service';
import { ResumeController } from './resume.controller';
import { ResumeService } from './services/resume.service';

@Module({
  imports: [
    AuthModule,
    RedisCacheModule,
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        inject: [ConfigService],
        name: JOBAGGREGATOR_USER_V1_PACKAGE_NAME,
        useFactory: (config: ConfigService): GrpcOptions => ({
          transport: Transport.GRPC,
          options: {
            package: JOBAGGREGATOR_USER_V1_PACKAGE_NAME,
            packageDefinition: grpcPackageDefinition,
            url: config.getOrThrow<string>('grpc.user.url'),
          },
        }),
      },
    ]),
  ],
  controllers: [ProfileController, ResumeController],
  providers: [ProfileService, ResumeService],
})
export class UserModule {}
