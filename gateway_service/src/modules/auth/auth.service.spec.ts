import { status } from '@grpc/grpc-js';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { GrpcErrorMapper } from '../../common/mappers/grpc-error.mapper';
import { AuthServiceClient } from '../../generated/auth/v1/auth';
import { AuthMapper } from './auth.mapper';
import { GatewayAuthService } from './auth.service';

describe('GatewayAuthService', () => {
  const session = {
    user: { id: 'user-id', email: 'user@example.com', roles: ['applicant'] },
    tokens: {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      access_token_expires_in_seconds: '900',
      refresh_token_expires_in_seconds: '2592000',
    },
  };

  let grpc: jest.Mocked<Pick<AuthServiceClient, 'register' | 'login' | 'refreshToken' | 'logout'>>;
  let service: GatewayAuthService;

  beforeEach(() => {
    grpc = {
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
    };
    const client = { getService: jest.fn().mockReturnValue(grpc) } as unknown as ClientGrpc;
    const config = { getOrThrow: jest.fn().mockReturnValue(3000) } as unknown as ConfigService;
    service = new GatewayAuthService(client, config, new AuthMapper(), new GrpcErrorMapper());
    service.onModuleInit();
  });

  it('returns a complete session from register', async () => {
    grpc.register.mockReturnValue(of(session));

    const request = {
      email: 'user@example.com',
      password: 'strong-password',
      first_name: 'Ivan',
      last_name: 'Petrov',
    };
    await expect(service.register(request)).resolves.toEqual(session);
    expect(grpc.register).toHaveBeenCalledWith({ ...request, phone_number: undefined });
  });

  it('maps a phone login identifier to phone_number for auth_service', async () => {
    grpc.login.mockReturnValue(
      of({
        ...session,
        user: { id: 'user-id', phone_number: '+79991234567', roles: ['applicant'] },
      }),
    );

    await service.login('+79991234567', 'strong-password');

    expect(grpc.login).toHaveBeenCalledWith({ phone_number: '+79991234567', password: 'strong-password' });
  });

  it('maps auth gRPC errors to gateway upstream errors', async () => {
    grpc.login.mockReturnValue(
      throwError(() => Object.assign(new Error('invalid credentials'), { code: status.UNAUTHENTICATED })),
    );

    await expect(service.login('user@example.com', 'wrong-password')).rejects.toMatchObject({
      service: 'auth service',
      kind: 'unauthenticated',
    });
  });

  it('rejects incomplete auth responses', async () => {
    grpc.register.mockReturnValue(of({ user: session.user, tokens: undefined }));

    await expect(
      service.register({
        email: 'user@example.com',
        password: 'strong-password',
        first_name: 'Ivan',
        last_name: 'Petrov',
      }),
    ).rejects.toMatchObject({ kind: 'invalid_response' });
  });
});
