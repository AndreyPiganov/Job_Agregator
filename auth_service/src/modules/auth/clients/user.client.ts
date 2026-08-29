import { status } from '@grpc/grpc-js';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { TimeoutError } from 'rxjs';
import { AuthApplicationError } from '../../../common/errors/auth-application.error';
import { AsyncUnaryGrpcClient, createUnaryGrpcClientProxy } from '../../../common/grpc/unary-grpc-client.proxy';
import {
  CreateUserRequest,
  JOBAGGREGATOR_USER_V1_PACKAGE_NAME,
  USER_SERVICE_NAME,
  UserServiceClient,
} from '../../../generated/user/v1/user';

@Injectable()
export class UserClient implements OnModuleInit {
  private users!: AsyncUnaryGrpcClient<UserServiceClient>;
  private readonly timeoutMs: number;

  constructor(
    @Inject(JOBAGGREGATOR_USER_V1_PACKAGE_NAME) private readonly client: ClientGrpc,
    config: ConfigService,
  ) {
    this.timeoutMs = config.getOrThrow<number>('grpc.user.timeoutMs');
  }

  onModuleInit(): void {
    this.users = createUnaryGrpcClientProxy(this.client.getService<UserServiceClient>(USER_SERVICE_NAME), {
      timeoutMs: this.timeoutMs,
      mapError: mapUserServiceError,
    });
  }

  async createUser(request: CreateUserRequest): Promise<boolean> {
    return (await this.users.createUser(request)).created;
  }
}

function mapUserServiceError(error: unknown): unknown {
  return isUnavailable(error) ? AuthApplicationError.unavailable(error) : error;
}

function isUnavailable(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  return error.code === status.UNAVAILABLE || error.code === status.DEADLINE_EXCEEDED;
}
