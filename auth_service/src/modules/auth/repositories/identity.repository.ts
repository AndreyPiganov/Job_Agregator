import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { IDENTITY_SELECT } from '../constants/identity.constants';
import { IdentityMapper } from '../mappers/identity.mapper';
import type { IdentityRecord, LoginIdentifier } from '../interfaces/auth.interfaces';

@Injectable()
export class IdentityRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: IdentityMapper,
  ) {}

  async createPasswordIdentity(identifier: LoginIdentifier, passwordHash: string): Promise<IdentityRecord> {
    const identity = await this.prisma.identity.create({
      data: {
        email: identifier.email,
        phoneNumber: identifier.phoneNumber,
        passwordCredential: { create: { passwordHash } },
      },
      select: IDENTITY_SELECT,
    });
    return this.mapper.toRecord(identity);
  }

  async findByIdentifier(identifier: LoginIdentifier): Promise<IdentityRecord | null> {
    const where = identifier.email ? { email: identifier.email } : { phoneNumber: identifier.phoneNumber };
    const identity = await this.prisma.identity.findUnique({ where, select: IDENTITY_SELECT });
    return identity ? this.mapper.toRecord(identity) : null;
  }

  async findById(identityId: string): Promise<IdentityRecord | null> {
    const identity = await this.prisma.identity.findUnique({ where: { id: identityId }, select: IDENTITY_SELECT });
    return identity ? this.mapper.toRecord(identity) : null;
  }

  async activate(identityId: string): Promise<IdentityRecord> {
    return this.mapper.toRecord(
      await this.prisma.identity.update({
        where: { id: identityId },
        data: { status: 'ACTIVE' },
        select: IDENTITY_SELECT,
      }),
    );
  }

  async recordSuccessfulLogin(identityId: string): Promise<void> {
    await this.prisma.identity.update({ where: { id: identityId }, data: { lastLoginAt: new Date() } });
  }
}
