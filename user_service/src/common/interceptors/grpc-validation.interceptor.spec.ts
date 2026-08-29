import {
  CreateUserRequestSchema,
  CreateResumeRequestSchema,
  UpsertUserProfileRequestSchema,
} from '../../generated/protovalidate/user/v1/user_pb';
import { UserApplicationError } from '../errors/user-application.error';
import { validateGrpcRequest } from './grpc-validation.interceptor';

const userId = '018f1f4e-7b5a-7c2d-8f31-f30e74d4d101';

describe('validateGrpcRequest', () => {
  it('accepts proto field names used by ts-proto and Nest gRPC', () => {
    expect(() =>
      validateGrpcRequest(CreateUserRequestSchema, {
        user_id: userId,
        first_name: 'Иван',
        last_name: 'Иванов',
        email: 'user@example.com',
      }),
    ).not.toThrow();
  });

  it('executes field rules from buf.validate', () => {
    expectInvalid(CreateUserRequestSchema, {
      user_id: 'not-a-uuid',
      first_name: 'Иван',
      last_name: 'Иванов',
      email: 'user@example.com',
    });
  });

  it('requires exactly one initial registration contact', () => {
    const request = {
      user_id: userId,
      first_name: 'Иван',
      last_name: 'Иванов',
    };
    expectInvalid(CreateUserRequestSchema, request);
    expectInvalid(CreateUserRequestSchema, {
      ...request,
      email: 'user@example.com',
      phone_number: '+79991234567',
    });
  });

  it('validates optional profile contacts', () => {
    const profile = {
      user_id: userId,
      first_name: 'Иван',
      last_name: 'Иванов',
      contacts: {
        email: 'contact@example.com',
        phone_number: '+79991234567',
        telegram_username: 'telegram_user',
        github_username: 'github-user',
      },
    };

    expect(() => validateGrpcRequest(UpsertUserProfileRequestSchema, profile)).not.toThrow();
    expectInvalid(UpsertUserProfileRequestSchema, {
      ...profile,
      contacts: { ...profile.contacts, phone_number: '89991234567' },
    });
    expectInvalid(UpsertUserProfileRequestSchema, {
      ...profile,
      contacts: { ...profile.contacts, telegram_username: '@telegram_user' },
    });
  });

  it('rejects duplicate language codes at the gRPC boundary', () => {
    expectInvalid(UpsertUserProfileRequestSchema, {
      user_id: userId,
      first_name: 'Иван',
      last_name: 'Иванов',
      languages: [
        { code: 'en', proficiency: 1 },
        { code: 'EN', proficiency: 2 },
      ],
    });
  });

  it('executes message CEL rules', () => {
    expectInvalid(CreateResumeRequestSchema, {
      user_id: userId,
      resume: {
        title: 'Backend developer',
        salary_amount: 150_000,
      },
    });
  });

  it('rejects duplicate reference ids at the gRPC boundary', () => {
    expectInvalid(CreateResumeRequestSchema, {
      user_id: userId,
      resume: {
        title: 'Backend developer',
        skill_ids: [7, 7],
      },
    });
  });
});

function expectInvalid(schema: Parameters<typeof validateGrpcRequest>[0], request: unknown): void {
  try {
    validateGrpcRequest(schema, request);
    throw new Error('expected validation to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(UserApplicationError);
    expect(error).toMatchObject({ kind: 'invalid_argument' });
  }
}
