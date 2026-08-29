import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { educationInclude, profileInclude } from './constants/profile.constants';
import {
  type EducationWriteData,
  type ProfileWriteData,
  type WorkExperienceWriteData,
} from './interfaces/profile.interfaces';

@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.userProfile.findUnique({ where: { userId }, include: profileInclude });
  }

  upsert(data: ProfileWriteData) {
    return this.prisma.$transaction(async (transaction) => {
      const profileData = {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        birthDate: data.birthDate,
        gender: data.gender,
        city: data.city,
        photoUrl: data.photoUrl,
        about: data.about,
        relocationReadiness: data.relocationReadiness,
      };

      await transaction.userProfile.upsert({
        where: { userId: data.userId },
        create: { userId: data.userId, ...profileData },
        update: profileData,
      });

      if (data.contacts) {
        await transaction.userContact.upsert({
          where: { userId: data.userId },
          create: { userId: data.userId, ...data.contacts },
          update: data.contacts,
        });
      } else {
        await transaction.userContact.deleteMany({ where: { userId: data.userId } });
      }

      await transaction.userLanguage.deleteMany({ where: { userId: data.userId } });
      if (data.languages.length > 0) {
        await transaction.userLanguage.createMany({
          data: data.languages.map((language) => ({
            userId: data.userId,
            languageCode: language.code,
            proficiency: language.proficiency,
          })),
        });
      }

      await transaction.userCitizenship.deleteMany({ where: { userId: data.userId } });
      if (data.citizenshipCodes.length > 0) {
        await transaction.userCitizenship.createMany({
          data: data.citizenshipCodes.map((countryCode) => ({ userId: data.userId, countryCode })),
        });
      }

      return transaction.userProfile.findUniqueOrThrow({ where: { userId: data.userId }, include: profileInclude });
    });
  }

  createEducation(userId: string, data: EducationWriteData) {
    return this.prisma.education.create({ data: { userId, ...data }, include: educationInclude });
  }

  async updateEducation(userId: string, educationId: string, data: EducationWriteData) {
    const owned = await this.prisma.education.findFirst({ where: { id: educationId, userId }, select: { id: true } });
    if (!owned) return null;
    return this.prisma.education.update({ where: { id: educationId }, data, include: educationInclude });
  }

  async deleteEducation(userId: string, educationId: string): Promise<boolean> {
    const result = await this.prisma.education.deleteMany({ where: { id: educationId, userId } });
    return result.count > 0;
  }

  createWorkExperience(userId: string, data: WorkExperienceWriteData) {
    return this.prisma.workExperience.create({ data: { userId, ...data } });
  }

  async updateWorkExperience(userId: string, workExperienceId: string, data: WorkExperienceWriteData) {
    const owned = await this.prisma.workExperience.findFirst({
      where: { id: workExperienceId, userId },
      select: { id: true },
    });
    if (!owned) return null;
    return this.prisma.workExperience.update({ where: { id: workExperienceId }, data });
  }

  async deleteWorkExperience(userId: string, workExperienceId: string): Promise<boolean> {
    const result = await this.prisma.workExperience.deleteMany({ where: { id: workExperienceId, userId } });
    return result.count > 0;
  }
}
