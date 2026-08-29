import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, GrpcOptions, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { grpcPackageDefinition } from '../../common/grpc/contracts';
import { JOBAGGREGATOR_AUTH_V1_PACKAGE_NAME } from '../../generated/auth/v1/auth';
import { AuthController } from './auth.controller';
import { AuthMapper } from './auth.mapper';
import { GatewayAuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    PassportModule,
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        inject: [ConfigService],
        name: JOBAGGREGATOR_AUTH_V1_PACKAGE_NAME,
        useFactory: (config: ConfigService): GrpcOptions => ({
          transport: Transport.GRPC,
          options: {
            package: JOBAGGREGATOR_AUTH_V1_PACKAGE_NAME,
            packageDefinition: grpcPackageDefinition,
            url: config.getOrThrow<string>('grpc.auth.url'),
          },
        }),
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [GatewayAuthService, AuthMapper, JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
