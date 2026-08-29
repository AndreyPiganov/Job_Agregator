import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { AsyncUnaryGrpcClient, createUnaryGrpcClientProxy } from '../../common/grpc/unary-grpc-client.proxy';
import { GrpcErrorMapper } from '../../common/mappers/grpc-error.mapper';
import {
  AUTH_SERVICE_NAME,
  AuthServiceClient,
  JOBAGGREGATOR_AUTH_V1_PACKAGE_NAME,
  TokenPair,
} from '../../generated/auth/v1/auth';
import { AuthMapper } from './auth.mapper';
import { RegisterDto } from './dto/register.dto';
import type { AuthSession } from './interfaces/auth.interfaces';

@Injectable()
export class GatewayAuthService implements OnModuleInit {
  private authClient!: AsyncUnaryGrpcClient<AuthServiceClient>;
  private readonly timeoutMs: number;

  constructor(
    @Inject(JOBAGGREGATOR_AUTH_V1_PACKAGE_NAME) private readonly client: ClientGrpc,
    config: ConfigService,
    private readonly mapper: AuthMapper,
    private readonly grpcErrors: GrpcErrorMapper,
  ) {
    this.timeoutMs = config.getOrThrow<number>('grpc.auth.timeoutMs');
  }

  onModuleInit(): void {
    this.authClient = createUnaryGrpcClientProxy(this.client.getService<AuthServiceClient>(AUTH_SERVICE_NAME), {
      service: 'auth service',
      timeoutMs: this.timeoutMs,
      errors: this.grpcErrors,
    });
  }

  async register(request: RegisterDto): Promise<AuthSession> {
    return this.mapper.sessionFromGrpc(await this.authClient.register(this.mapper.registerToGrpc(request)));
  }

  async login(identifier: string, password: string): Promise<AuthSession> {
    return this.mapper.sessionFromGrpc(await this.authClient.login(this.mapper.loginToGrpc(identifier, password)));
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const response = await this.authClient.refreshToken({ refresh_token: refreshToken });
    return this.mapper.tokenPairFromGrpc(response.tokens);
  }

  async logout(refreshToken: string): Promise<boolean> {
    return (await this.authClient.logout({ refresh_token: refreshToken })).revoked;
  }
}
