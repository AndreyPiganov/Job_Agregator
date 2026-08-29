import {
  LoginRequestSchema,
  RefreshTokenRequestSchema,
  RegisterRequestSchema,
} from '../../generated/protovalidate/auth/v1/auth_pb';
import { AuthApplicationError } from '../errors/auth-application.error';
import { validateGrpcRequest } from './grpc-validation.interceptor';

describe('validateGrpcRequest', () => {
  it('accepts valid auth requests', () => {
    expect(() =>
      validateGrpcRequest(RegisterRequestSchema, {
        email: 'user@example.com',
        password: 'strong-password',
        first_name: 'Ivan',
        last_name: 'Petrov',
      }),
    ).not.toThrow();
  });

  it('rejects malformed email and a short registration password', () => {
    expectInvalid(RegisterRequestSchema, {
      email: 'not-an-email',
      password: 'short',
      first_name: 'Ivan',
      last_name: 'Petrov',
    });
    expectInvalid(LoginRequestSchema, { email: 'not-an-email', password: 'strong-password' });
  });

  it('rejects registration passwords longer than the bcrypt byte limit', () => {
    expectInvalid(RegisterRequestSchema, {
      email: 'user@example.com',
      password: 'я'.repeat(37),
      first_name: 'Ivan',
      last_name: 'Petrov',
    });
  });

  it('accepts phone login and rejects ambiguous identifiers', () => {
    expect(() =>
      validateGrpcRequest(LoginRequestSchema, {
        phone_number: '+79991234567',
        password: 'strong-password',
      }),
    ).not.toThrow();
    expectInvalid(LoginRequestSchema, {
      email: 'user@example.com',
      phone_number: '+79991234567',
      password: 'strong-password',
    });
  });

  it('rejects empty and unreasonably large tokens', () => {
    expectInvalid(RefreshTokenRequestSchema, { refresh_token: '' });
    expectInvalid(RefreshTokenRequestSchema, { refresh_token: 'x'.repeat(8193) });
  });
});

function expectInvalid(schema: Parameters<typeof validateGrpcRequest>[0], request: unknown): void {
  try {
    validateGrpcRequest(schema, request);
    throw new Error('expected validation to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(AuthApplicationError);
    expect(error).toMatchObject({ kind: 'invalid_argument' });
  }
}
