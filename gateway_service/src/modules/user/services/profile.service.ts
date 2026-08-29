import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { AppCacheService } from '../../../common/cache/app-cache.service';
import { AsyncUnaryGrpcClient, createUnaryGrpcClientProxy } from '../../../common/grpc/unary-grpc-client.proxy';
import { GrpcErrorMapper } from '../../../common/mappers/grpc-error.mapper';
import {
  Education,
  JOBAGGREGATOR_USER_V1_PACKAGE_NAME,
  UserProfile,
  USER_PROFILE_SERVICE_NAME,
  UserProfileServiceClient,
  WorkExperience,
} from '../../../generated/user/v1/user';
import { EducationDto, UpsertProfileDto, WorkExperienceDto } from '../dto/profile.dto';

@Injectable()
export class ProfileService implements OnModuleInit {
  private profiles!: AsyncUnaryGrpcClient<UserProfileServiceClient>;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;

  constructor(
    @Inject(JOBAGGREGATOR_USER_V1_PACKAGE_NAME) private readonly client: ClientGrpc,
    config: ConfigService,
    private readonly grpcErrors: GrpcErrorMapper,
    private readonly cache: AppCacheService,
  ) {
    this.timeoutMs = config.getOrThrow<number>('grpc.user.timeoutMs');
    this.cacheTtlMs = config.get<number>('cache.ttlMs', 15000);
  }

  onModuleInit(): void {
    this.profiles = createUnaryGrpcClientProxy(
      this.client.getService<UserProfileServiceClient>(USER_PROFILE_SERVICE_NAME),
      {
        service: 'user service',
        timeoutMs: this.timeoutMs,
        errors: this.grpcErrors,
      },
    );
  }

  async get(userId: string): Promise<UserProfile> {
    const cacheKey = profileCacheKey(userId);
    const cached = await this.cache.get<UserProfile>(cacheKey);
    if (cached !== undefined) return cached;

    const profile = (await this.profiles.getUserProfile({ user_id: userId })).profile;
    await this.cache.set(cacheKey, profile, this.cacheTtlMs);
    return profile;
  }

  async upsert(userId: string, profile: UpsertProfileDto): Promise<UserProfile> {
    const updated = (await this.profiles.upsertUserProfile({ user_id: userId, ...profile })).profile;
    await this.cache.set(profileCacheKey(userId), updated, this.cacheTtlMs);
    return updated;
  }

  async createEducation(userId: string, education: EducationDto): Promise<Education> {
    const created = (await this.profiles.createEducation({ user_id: userId, education })).education;
    await this.cache.delete(profileCacheKey(userId));
    return created;
  }

  async updateEducation(userId: string, educationId: string, educationDto: EducationDto): Promise<Education> {
    const updated = (
      await this.profiles.updateEducation({ user_id: userId, education_id: educationId, education: educationDto })
    ).education;
    await this.cache.delete(profileCacheKey(userId));
    return updated;
  }

  async deleteEducation(userId: string, educationId: string): Promise<{ deleted: boolean }> {
    const { deleted } = await this.profiles.deleteEducation({ user_id: userId, education_id: educationId });
    await this.cache.delete(profileCacheKey(userId));
    return { deleted };
  }

  async createWorkExperience(userId: string, workExperience: WorkExperienceDto): Promise<WorkExperience> {
    const created = (await this.profiles.createWorkExperience({ user_id: userId, work_experience: workExperience }))
      .work_experience;
    await this.cache.delete(profileCacheKey(userId));
    return created;
  }

  async updateWorkExperience(
    userId: string,
    workExperienceId: string,
    workExperience: WorkExperienceDto,
  ): Promise<WorkExperience> {
    const updated = (
      await this.profiles.updateWorkExperience({
        user_id: userId,
        work_experience_id: workExperienceId,
        work_experience: workExperience,
      })
    ).work_experience;
    await this.cache.delete(profileCacheKey(userId));
    return updated;
  }

  async deleteWorkExperience(userId: string, workExperienceId: string): Promise<{ deleted: boolean }> {
    const { deleted } = await this.profiles.deleteWorkExperience({
      user_id: userId,
      work_experience_id: workExperienceId,
    });
    await this.cache.delete(profileCacheKey(userId));
    return { deleted };
  }
}

function profileCacheKey(userId: string): string {
  return `user:profile:${userId}`;
}
