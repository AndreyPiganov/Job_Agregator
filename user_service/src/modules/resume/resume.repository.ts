import { Injectable } from '@nestjs/common';
import { ResumeStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../common/database/prisma.service';
import { resumeInclude } from './constants/resume.constants';
import type { ResumeReferenceSummary, ResumeWriteData } from './interfaces/resume.interfaces';

@Injectable()
export class ResumeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async userExists(userId: string): Promise<boolean> {
    return (await this.prisma.user.count({ where: { id: userId } })) > 0;
  }

  async ownedResumeExists(userId: string, resumeId: string): Promise<boolean> {
    return (await this.prisma.resume.count({ where: { id: resumeId, userId } })) > 0;
  }

  async profileExists(userId: string): Promise<boolean> {
    return (await this.prisma.userProfile.count({ where: { userId } })) > 0;
  }

  async getReferenceSummary(userId: string, data: ResumeWriteData): Promise<ResumeReferenceSummary> {
    const [educationCount, workExperiences, skillCount, professionalRoleCount] = await Promise.all([
      this.prisma.education.count({ where: { id: { in: data.educationIds }, userId } }),
      this.prisma.workExperience.findMany({
        where: { id: { in: data.workExperienceIds }, userId },
        select: { startedAt: true, endedAt: true },
      }),
      this.prisma.skill.count({ where: { id: { in: data.skillIds } } }),
      this.prisma.professionalRole.count({ where: { id: { in: data.professionalRoleIds } } }),
    ]);

    return { educationCount, workExperiences, skillCount, professionalRoleCount };
  }

  findOwned(userId: string, resumeId: string) {
    return this.prisma.resume.findFirst({ where: { id: resumeId, userId }, include: resumeInclude });
  }

  listOwned(userId: string) {
    return this.prisma.resume.findMany({
      where: { userId },
      include: resumeInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  create(userId: string, data: ResumeWriteData, totalExperienceMonths: number) {
    return this.prisma.resume.create({
      data: {
        userId,
        ...scalarData(data, totalExperienceMonths),
        educations: {
          create: data.educationIds.map((educationId) => ({ education: { connect: { id: educationId } } })),
        },
        workExperiences: {
          create: data.workExperienceIds.map((workExperienceId) => ({
            workExperience: { connect: { id: workExperienceId } },
          })),
        },
        skills: { create: data.skillIds.map((skillId) => ({ skill: { connect: { id: skillId } } })) },
        professionalRoles: {
          create: data.professionalRoleIds.map((professionalRoleId) => ({
            professionalRole: { connect: { id: professionalRoleId } },
          })),
        },
        certificates: { create: data.certificates },
      },
      include: resumeInclude,
    });
  }

  update(userId: string, resumeId: string, data: ResumeWriteData, totalExperienceMonths: number) {
    return this.prisma.resume.update({
      where: { id: resumeId, userId },
      data: {
        ...scalarData(data, totalExperienceMonths),
        educations: {
          deleteMany: {},
          create: data.educationIds.map((educationId) => ({ education: { connect: { id: educationId } } })),
        },
        workExperiences: {
          deleteMany: {},
          create: data.workExperienceIds.map((workExperienceId) => ({
            workExperience: { connect: { id: workExperienceId } },
          })),
        },
        skills: {
          deleteMany: {},
          create: data.skillIds.map((skillId) => ({ skill: { connect: { id: skillId } } })),
        },
        professionalRoles: {
          deleteMany: {},
          create: data.professionalRoleIds.map((professionalRoleId) => ({
            professionalRole: { connect: { id: professionalRoleId } },
          })),
        },
        certificates: { deleteMany: {}, create: data.certificates },
      },
      include: resumeInclude,
    });
  }

  setStatus(userId: string, resumeId: string, status: ResumeStatus) {
    return this.prisma.resume.update({
      where: { id: resumeId, userId },
      data: {
        status,
        ...(status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
      },
      include: resumeInclude,
    });
  }

  async delete(userId: string, resumeId: string): Promise<boolean> {
    const result = await this.prisma.resume.deleteMany({ where: { id: resumeId, userId } });
    return result.count > 0;
  }
}

function scalarData(data: ResumeWriteData, totalExperienceMonths: number) {
  return {
    title: data.title,
    about: data.about,
    city: data.city,
    visibility: data.visibility,
    searchStatus: data.searchStatus,
    businessTripReadiness: data.businessTripReadiness,
    salaryAmount: data.salaryAmount,
    salaryCurrency: data.salaryCurrency,
    totalExperienceMonths,
    employmentTypes: data.employmentTypes,
    workSchedules: data.workSchedules,
    workFormats: data.workFormats,
  };
}
