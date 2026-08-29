import { status } from '@grpc/grpc-js';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { CreateUserRequest, UserServiceClient } from '../../../generated/user/v1/user';
import { UserClient } from './user.client';

describe('UserClient', () => {
  const request: CreateUserRequest = {
    user_id: '3466eb2d-3daa-4ba9-a3ad-b0df9b2be7fd',
    first_name: 'Ivan',
    last_name: 'Petrov',
    email: 'user@example.com',
  };
  let grpc: jest.Mocked<Pick<UserServiceClient, 'createUser'>>;
  let service: UserClient;

  beforeEach(() => {
    grpc = { createUser: jest.fn() };
    const client = { getService: jest.fn().mockReturnValue(grpc) } as unknown as ClientGrpc;
    const config = { getOrThrow: jest.fn().mockReturnValue(3000) } as unknown as ConfigService;

    service = new UserClient(client, config);
    service.onModuleInit();
  });

  it('creates a user through the generated gRPC client', async () => {
    grpc.createUser.mockReturnValue(of({ created: true }));

    await expect(service.createUser(request)).resolves.toBe(true);
    expect(grpc.createUser).toHaveBeenCalledWith(request);
  });

  it('preserves upstream gRPC failures for the application service to map', async () => {
    const upstreamError = new Error('user_service unavailable');
    grpc.createUser.mockReturnValue(throwError(() => upstreamError));

    await expect(service.createUser(request)).rejects.toBe(upstreamError);
  });

  it('maps unavailable upstream transport errors at the gRPC boundary', async () => {
    const upstreamError = Object.assign(new Error('connection refused'), { code: status.UNAVAILABLE });
    grpc.createUser.mockReturnValue(throwError(() => upstreamError));

    await expect(service.createUser(request)).rejects.toMatchObject({ kind: 'unavailable' });
  });
});
