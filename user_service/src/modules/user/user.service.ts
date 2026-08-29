import { Injectable } from '@nestjs/common';
import { CreateUserRequest } from '../../generated/user/v1/user';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(private readonly users: UserRepository) {}

  async create(request: CreateUserRequest): Promise<boolean> {
    const data = {
      id: request.user_id,
      firstName: canonicalizeName(request.first_name),
      lastName: canonicalizeName(request.last_name),
      email: request.email?.trim().toLowerCase() ?? null,
      phoneNumber: request.phone_number?.trim() ?? null,
    };

    if (await this.users.exists(data.id)) return false;

    await this.users.create(data);
    return true;
  }
}

function canonicalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
