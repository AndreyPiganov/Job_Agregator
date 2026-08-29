import { CreateUserRequest } from '../../generated/user/v1/user';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

describe('UserService', () => {
  const request: CreateUserRequest = {
    user_id: '17c43d0d-11f3-4700-89d8-28f965a132d6',
    first_name: '  Ivan  ',
    last_name: '  Petrov  ',
    email: ' USER@Example.com ',
  };

  it('creates the minimal profile and initial registration contact', async () => {
    const users: jest.Mocked<Pick<UserRepository, 'exists' | 'create'>> = {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue(undefined),
    };
    const service = new UserService(users as unknown as UserRepository);

    await expect(service.create(request)).resolves.toBe(true);
    expect(users.create).toHaveBeenCalledWith({
      id: request.user_id,
      firstName: 'Ivan',
      lastName: 'Petrov',
      email: 'user@example.com',
      phoneNumber: null,
    });
  });

  it('returns false without creating an already existing user', async () => {
    const users: jest.Mocked<Pick<UserRepository, 'exists' | 'create'>> = {
      exists: jest.fn().mockResolvedValue(true),
      create: jest.fn(),
    };
    const service = new UserService(users as unknown as UserRepository);

    await expect(service.create(request)).resolves.toBe(false);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('leaves database failures for the global exception filters', async () => {
    const databaseError = new Error('database unavailable');
    const users: jest.Mocked<Pick<UserRepository, 'exists' | 'create'>> = {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockRejectedValue(databaseError),
    };
    const service = new UserService(users as unknown as UserRepository);

    await expect(service.create(request)).rejects.toBe(databaseError);
  });
});
