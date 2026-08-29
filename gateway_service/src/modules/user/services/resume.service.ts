import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { AppCacheService } from '../../../common/cache/app-cache.service';
import { AsyncUnaryGrpcClient, createUnaryGrpcClientProxy } from '../../../common/grpc/unary-grpc-client.proxy';
import { GrpcErrorMapper } from '../../../common/mappers/grpc-error.mapper';
import {
  JOBAGGREGATOR_USER_V1_PACKAGE_NAME,
  RESUME_SERVICE_NAME,
  Resume,
  ResumeServiceClient,
} from '../../../generated/user/v1/user';
import { ResumeDto, SetResumeStatusDto } from '../dto/resume.dto';

@Injectable()
export class ResumeService implements OnModuleInit {
  private resumes!: AsyncUnaryGrpcClient<ResumeServiceClient>;
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
    this.resumes = createUnaryGrpcClientProxy(this.client.getService<ResumeServiceClient>(RESUME_SERVICE_NAME), {
      service: 'user service',
      timeoutMs: this.timeoutMs,
      errors: this.grpcErrors,
    });
  }

  async create(userId: string, resume: ResumeDto): Promise<Resume> {
    const created = (await this.resumes.createResume({ user_id: userId, resume })).resume;
    await Promise.all([
      this.cache.set(resumeCacheKey(userId, created.id), created, this.cacheTtlMs),
      this.cache.delete(resumeListCacheKey(userId)),
    ]);
    return created;
  }

  async get(userId: string, resumeId: string): Promise<Resume> {
    const cacheKey = resumeCacheKey(userId, resumeId);
    const cached = await this.cache.get<Resume>(cacheKey);
    if (cached !== undefined) return cached;

    const resume = (await this.resumes.getResume({ user_id: userId, resume_id: resumeId })).resume;
    await this.cache.set(cacheKey, resume, this.cacheTtlMs);
    return resume;
  }

  async list(userId: string): Promise<Resume[]> {
    const cacheKey = resumeListCacheKey(userId);
    const cached = await this.cache.get<Resume[]>(cacheKey);
    if (cached !== undefined) return cached;

    const resumes = (await this.resumes.listResumes({ user_id: userId })).resumes;
    await this.cache.set(cacheKey, resumes, this.cacheTtlMs);
    return resumes;
  }

  async update(userId: string, resumeId: string, resume: ResumeDto): Promise<Resume> {
    const updated = (await this.resumes.updateResume({ user_id: userId, resume_id: resumeId, resume })).resume;
    await Promise.all([
      this.cache.set(resumeCacheKey(userId, resumeId), updated, this.cacheTtlMs),
      this.cache.delete(resumeListCacheKey(userId)),
    ]);
    return updated;
  }

  async setStatus(userId: string, resumeId: string, request: SetResumeStatusDto): Promise<Resume> {
    const updated = (
      await this.resumes.setResumeStatus({ user_id: userId, resume_id: resumeId, status: request.status })
    ).resume;
    await Promise.all([
      this.cache.set(resumeCacheKey(userId, resumeId), updated, this.cacheTtlMs),
      this.cache.delete(resumeListCacheKey(userId)),
    ]);
    return updated;
  }

  async delete(userId: string, resumeId: string): Promise<{ deleted: boolean }> {
    const { deleted } = await this.resumes.deleteResume({ user_id: userId, resume_id: resumeId });
    await this.cache.delete(resumeCacheKey(userId, resumeId), resumeListCacheKey(userId));
    return { deleted };
  }
}

function resumeCacheKey(userId: string, resumeId: string): string {
  return `user:resume:${userId}:${resumeId}`;
}

function resumeListCacheKey(userId: string): string {
  return `user:resumes:${userId}`;
}
