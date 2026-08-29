import { Injectable } from '@nestjs/common';
import { UserApplicationError } from '../../common/errors/user-application.error';
import {
  CreateEducationRequest,
  CreateWorkExperienceRequest,
  Education,
  UpdateEducationRequest,
  UpdateWorkExperienceRequest,
  UpsertUserProfileRequest,
  UserProfile,
  WorkExperience,
} from '../../generated/user/v1/user';
import { ProfileMapper } from './profile.mapper';
import { ProfileRepository } from './profile.repository';

@Injectable()
export class ProfileService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly mapper: ProfileMapper,
  ) {}

  async get(userId: string): Promise<UserProfile> {
    const profile = await this.profiles.findByUserId(userId);
    if (!profile) throw UserApplicationError.notFound('user profile');
    return this.mapper.toGrpc(profile);
  }

  async upsert(request: UpsertUserProfileRequest): Promise<UserProfile> {
    const userId = request.user_id;
    const user = await this.profiles.findByUserId(userId);
    if (!user) throw UserApplicationError.notFound('user');

    return this.mapper.toGrpc(await this.profiles.upsert(this.mapper.toWriteData(request)));
  }

  async createEducation(request: CreateEducationRequest): Promise<Education> {
    const userId = request.user_id;
    const user = await this.profiles.findByUserId(userId);
    if (!user) throw UserApplicationError.notFound('user profile');
    return this.mapper.educationToGrpc(
      await this.profiles.createEducation(userId, this.mapper.educationToWriteData(request.education)),
    );
  }

  async updateEducation(request: UpdateEducationRequest): Promise<Education> {
    const education = await this.profiles.updateEducation(
      request.user_id,
      request.education_id,
      this.mapper.educationToWriteData(request.education),
    );
    if (!education) throw UserApplicationError.notFound('education');
    return this.mapper.educationToGrpc(education);
  }

  deleteEducation(userId: string, educationId: string): Promise<boolean> {
    return this.profiles.deleteEducation(userId, educationId);
  }

  async createWorkExperience(request: CreateWorkExperienceRequest): Promise<WorkExperience> {
    const userId = request.user_id;
    const user = await this.profiles.findByUserId(userId);
    if (!user) throw UserApplicationError.notFound('user profile');
    return this.mapper.workExperienceToGrpc(
      await this.profiles.createWorkExperience(userId, this.mapper.workExperienceToWriteData(request.work_experience)),
    );
  }

  async updateWorkExperience(request: UpdateWorkExperienceRequest): Promise<WorkExperience> {
    const workExperience = await this.profiles.updateWorkExperience(
      request.user_id,
      request.work_experience_id,
      this.mapper.workExperienceToWriteData(request.work_experience),
    );
    if (!workExperience) throw UserApplicationError.notFound('work experience');
    return this.mapper.workExperienceToGrpc(workExperience);
  }

  deleteWorkExperience(userId: string, workExperienceId: string): Promise<boolean> {
    return this.profiles.deleteWorkExperience(userId, workExperienceId);
  }
}
