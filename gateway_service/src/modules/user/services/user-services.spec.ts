import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { of } from 'rxjs';
import { AppCacheService } from '../../../common/cache/app-cache.service';
import { GrpcErrorMapper } from '../../../common/mappers/grpc-error.mapper';
import { Resume, ResumeServiceClient, UserProfile, UserProfileServiceClient } from '../../../generated/user/v1/user';
import { ProfileService } from './profile.service';
import { ResumeService } from './resume.service';

describe('User gateway services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('takes profile ownership from the authenticated principal', async () => {
    const profiles: jest.Mocked<Pick<UserProfileServiceClient, 'upsertUserProfile'>> = {
      upsertUserProfile: jest.fn().mockReturnValue(
        of({
          profile: { user_id: 'authenticated-user-id' } as UserProfile,
        }),
      ),
    };
    const cache = cacheService();
    const service = new ProfileService(
      grpcClient(profiles),
      config(),
      new GrpcErrorMapper(),
      cache as unknown as AppCacheService,
    );
    service.onModuleInit();
    const dto = {
      first_name: 'Иван',
      last_name: 'Иванов',
      languages: [],
      citizenship_codes: [],
    };

    await service.upsert('authenticated-user-id', dto);

    expect(profiles.upsertUserProfile).toHaveBeenCalledWith({ user_id: 'authenticated-user-id', ...dto });
    expect(cache.set).toHaveBeenCalledWith(
      'user:profile:authenticated-user-id',
      expect.objectContaining({ user_id: 'authenticated-user-id' }),
      15000,
    );
  });

  it('returns a cached profile without calling user_service', async () => {
    const profiles: jest.Mocked<Pick<UserProfileServiceClient, 'getUserProfile'>> = {
      getUserProfile: jest.fn(),
    };
    const cache = cacheService();
    cache.get.mockResolvedValue({ user_id: 'authenticated-user-id' });
    const service = new ProfileService(
      grpcClient(profiles),
      config(),
      new GrpcErrorMapper(),
      cache as unknown as AppCacheService,
    );
    service.onModuleInit();

    await expect(service.get('authenticated-user-id')).resolves.toMatchObject({
      user_id: 'authenticated-user-id',
    });
    expect(profiles.getUserProfile).not.toHaveBeenCalled();
  });

  it('takes resume ownership from the authenticated principal', async () => {
    const resumes: jest.Mocked<Pick<ResumeServiceClient, 'createResume'>> = {
      createResume: jest.fn().mockReturnValue(of({ resume: { id: 'resume-id' } as Resume })),
    };
    const cache = cacheService();
    const service = new ResumeService(
      grpcClient(resumes),
      config(),
      new GrpcErrorMapper(),
      cache as unknown as AppCacheService,
    );
    service.onModuleInit();
    const dto = {
      title: 'Backend-разработчик',
      employment_types: [],
      work_schedules: [],
      work_formats: [],
      education_ids: [],
      work_experience_ids: [],
      skill_ids: [],
      professional_role_ids: [],
      certificates: [],
    };

    await service.create('authenticated-user-id', dto);

    expect(resumes.createResume).toHaveBeenCalledWith({ user_id: 'authenticated-user-id', resume: dto });
    expect(cache.set).toHaveBeenCalledWith(
      'user:resume:authenticated-user-id:resume-id',
      expect.objectContaining({ id: 'resume-id' }),
      15000,
    );
    expect(cache.delete).toHaveBeenCalledWith('user:resumes:authenticated-user-id');
  });

  it('returns a cached resume list without calling user_service', async () => {
    const resumes: jest.Mocked<Pick<ResumeServiceClient, 'listResumes'>> = {
      listResumes: jest.fn(),
    };
    const cache = cacheService();
    cache.get.mockResolvedValue([{ id: 'resume-id' }] as Resume[]);
    const service = new ResumeService(
      grpcClient(resumes),
      config(),
      new GrpcErrorMapper(),
      cache as unknown as AppCacheService,
    );
    service.onModuleInit();

    await expect(service.list('authenticated-user-id')).resolves.toEqual([{ id: 'resume-id' }]);
    expect(resumes.listResumes).not.toHaveBeenCalled();
  });
});

function grpcClient(service: object): ClientGrpc {
  return { getService: jest.fn().mockReturnValue(service) } as unknown as ClientGrpc;
}

function config(): ConfigService {
  return {
    getOrThrow: jest.fn().mockReturnValue(3000),
    get: jest.fn((_key: string, defaultValue: number) => defaultValue),
  } as unknown as ConfigService;
}

function cacheService(): jest.Mocked<Pick<AppCacheService, 'get' | 'set' | 'delete'>> {
  return {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}
