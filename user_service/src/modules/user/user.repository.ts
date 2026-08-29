import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import type { CreateUserData } from './interfaces/user.interfaces';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async exists(userId: string): Promise<boolean> {
    return (await this.prisma.user.count({ where: { id: userId } })) > 0;
  }

  async create(data: CreateUserData): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.create({ data: { id: data.id }, select: { id: true } });
      await transaction.userProfile.create({
        data: {
          userId: data.id,
          firstName: data.firstName,
          lastName: data.lastName,
        },
        select: { userId: true },
      });
      await transaction.userContact.create({
        data: {
          userId: data.id,
          email: data.email,
          phoneNumber: data.phoneNumber,
        },
        select: { userId: true },
      });
    });
  }
}
