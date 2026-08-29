import { Injectable } from '@nestjs/common';
import type { IdentityRecord, IdentitySelection } from '../interfaces/auth.interfaces';

@Injectable()
export class IdentityMapper {
  toRecord(identity: IdentitySelection): IdentityRecord {
    return {
      id: identity.id,
      email: identity.email,
      phoneNumber: identity.phoneNumber,
      passwordHash: identity.passwordCredential?.passwordHash ?? null,
      roles: identity.roles.map((role) => role.toLowerCase()),
      status: identity.status,
    };
  }
}
