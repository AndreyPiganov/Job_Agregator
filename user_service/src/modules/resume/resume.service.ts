import { Injectable } from '@nestjs/common';
import { UserApplicationError } from '../../common/errors/user-application.error';
import { CreateResumeRequest, Resume, SetResumeStatusRequest, UpdateResumeRequest } from '../../generated/user/v1/user';
import { calculateExperienceMonths } from './utils/resume-experience.calculator';
import { ResumeMapper } from './resume.mapper';
import { ResumeRepository } from './resume.repository';
import type { ResumeWriteData } from './interfaces/resume.interfaces';

@Injectable()
export class ResumeService {
  constructor(
    private readonly resumes: ResumeRepository,
    private readonly mapper: ResumeMapper,
  ) {}

  async create(request: CreateResumeRequest): Promise<Resume> {
    const userId = request.user_id;
    const data = this.mapper.toWriteData(request.resume);
    const user = await this.resumes.userExists(userId);
    if (!user) throw UserApplicationError.notFound('user');

    const totalExperienceMonths = await this.validateReferences(userId, data);
    return this.mapper.toGrpc(await this.resumes.create(userId, data, totalExperienceMonths));
  }

  async get(userId: string, resumeId: string): Promise<Resume> {
    const resume = await this.resumes.findOwned(userId, resumeId);
    if (!resume) throw UserApplicationError.notFound('resume');
    return this.mapper.toGrpc(resume);
  }

  async list(userId: string): Promise<Resume[]> {
    return (await this.resumes.listOwned(userId)).map((resume) => this.mapper.toGrpc(resume));
  }

  async update(request: UpdateResumeRequest): Promise<Resume> {
    const userId = request.user_id;
    const resumeId = request.resume_id;
    const data = this.mapper.toWriteData(request.resume);
    const resume = await this.resumes.ownedResumeExists(userId, resumeId);
    if (!resume) throw UserApplicationError.notFound('resume');

    const totalExperienceMonths = await this.validateReferences(userId, data);
    return this.mapper.toGrpc(await this.resumes.update(userId, resumeId, data, totalExperienceMonths));
  }

  async setStatus(request: SetResumeStatusRequest): Promise<Resume> {
    const userId = request.user_id;
    const resumeId = request.resume_id;
    const status = this.mapper.statusFromGrpc(request.status);
    const resume = await this.resumes.ownedResumeExists(userId, resumeId);
    if (!resume) {
      throw UserApplicationError.notFound('resume');
    }
    const profile = await this.resumes.profileExists(userId);
    if (status === 'PUBLISHED' && !profile) {
      throw UserApplicationError.failedPrecondition('a completed user profile is required to publish a resume');
    }
    return this.mapper.toGrpc(await this.resumes.setStatus(userId, resumeId, status));
  }

  delete(userId: string, resumeId: string): Promise<boolean> {
    return this.resumes.delete(userId, resumeId);
  }

  private async validateReferences(userId: string, data: ResumeWriteData): Promise<number> {
    const references = await this.resumes.getReferenceSummary(userId, data);
    const valid =
      references.educationCount === data.educationIds.length &&
      references.workExperiences.length === data.workExperienceIds.length &&
      references.skillCount === data.skillIds.length &&
      references.professionalRoleCount === data.professionalRoleIds.length;

    if (!valid) {
      throw UserApplicationError.invalidArgument(
        'education, work experience, skill, or professional role reference is invalid or not owned by the user',
      );
    }
    return calculateExperienceMonths(references.workExperiences);
  }
}
