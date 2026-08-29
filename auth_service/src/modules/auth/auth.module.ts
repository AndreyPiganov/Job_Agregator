import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, GrpcOptions, Transport } from '@nestjs/microservices';
import { grpcPackageDefinition } from '../../common/grpc/contracts';
import { JOBAGGREGATOR_USER_V1_PACKAGE_NAME } from '../../generated/user/v1/user';
import { AuthController } from './auth.controller';
import { AuthMapper } from './mappers/auth.mapper';
import { AuthService } from './services/auth.service';
import { UserClient } from './clients/user.client';
import { IdentityRepository } from './repositories/identity.repository';
import { PasswordService } from './services/password.service';
import { SessionService } from './services/session.service';
import { TokenService } from './services/token.service';
import { IdentityMapper } from './mappers/identity.mapper';

@Module({
  imports: [
    JwtModule.register({}),
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
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthMapper,
    IdentityMapper,
    PasswordService,
    TokenService,
    SessionService,
    IdentityRepository,
    UserClient,
  ],
})
export class AuthModule {}
