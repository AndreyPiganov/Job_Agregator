import { UserEnumMapper } from '../../common/mappers/user-enum.mapper';
import { ResumeDraft, ResumeStatus, ResumeVisibility, SearchStatus } from '../../generated/user/v1/user';
import { ProfileMapper } from '../profile/profile.mapper';
import { ResumeMapper } from './resume.mapper';
import { ResumeRepository } from './resume.repository';
import { ResumeService } from './resume.service';
import type { ResumeRecord } from './interfaces/resume.interfaces';

const userId = '9c223e2d-5101-4e7d-9a79-334a61d2b6e1';
const resumeId = '194560d8-608d-4f8a-b122-e9f4d79cb331';

describe('ResumeService', () => {
  let resumes: jest.Mocked<
    Pick<
      ResumeRepository,
      'userExists' | 'ownedResumeExists' | 'profileExists' | 'getReferenceSummary' | 'create' | 'update' | 'setStatus'
    >
  >;
  let service: ResumeService;

  beforeEach(() => {
    resumes = {
      userExists: jest.fn().mockResolvedValue(true),
      ownedResumeExists: jest.fn().mockResolvedValue(true),
      profileExists: jest.fn().mockResolvedValue(true),
      getReferenceSummary: jest.fn().mockResolvedValue({
        educationCount: 0,
        workExperiences: [],
        skillCount: 0,
        professionalRoleCount: 0,
      }),
      create: jest.fn().mockResolvedValue(
        resumeRecord({
          salaryAmount: 150_000,
          salaryCurrency: 'RUB',
          totalExperienceMonths: 12,
        }),
      ),
      update: jest.fn().mockResolvedValue(resumeRecord()),
      setStatus: jest.fn().mockResolvedValue(resumeRecord()),
    };
    const enums = new UserEnumMapper();
    const mapper = new ResumeMapper(enums, new ProfileMapper(enums));
    service = new ResumeService(resumes as unknown as ResumeRepository, mapper);
  });

  it('normalizes a valid draft and applies defaults before persistence', async () => {
    resumes.getReferenceSummary.mockResolvedValue({
      educationCount: 0,
      workExperiences: [
        {
          startedAt: new Date('2024-01-01T00:00:00.000Z'),
          endedAt: new Date('2025-01-01T00:00:00.000Z'),
        },
      ],
      skillCount: 0,
      professionalRoleCount: 0,
    });

    const result = await service.create({
      user_id: userId,
      resume: draft({
        salary_amount: 150_000,
        salary_currency: ' rub ',
        work_experience_ids: ['work-experience-id'],
      }),
    });

    expect(result).toMatchObject({
      title: 'Backend developer',
      salary_amount: 150_000,
      salary_currency: 'RUB',
      total_experience_months: 12,
    });
    expect(resumes.create).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        title: 'Backend developer',
        salaryAmount: 150_000,
        salaryCurrency: 'RUB',
        visibility: 'REGISTERED_EMPLOYERS',
        searchStatus: 'ACTIVE_SEARCH',
      }),
      12,
    );
  });

  it('requires salary amount and currency as a pair before querying the database', async () => {
    await expect(service.create({ user_id: userId, resume: draft({ salary_amount: 150_000 }) })).rejects.toMatchObject({
      kind: 'invalid_argument',
    });
    expect(resumes.userExists).not.toHaveBeenCalled();
    expect(resumes.create).not.toHaveBeenCalled();
  });

  it('checks the user in the service before creating a resume', async () => {
    resumes.userExists.mockResolvedValue(false);

    await expect(service.create({ user_id: userId, resume: draft() })).rejects.toMatchObject({ kind: 'not_found' });
    expect(resumes.getReferenceSummary).not.toHaveBeenCalled();
    expect(resumes.create).not.toHaveBeenCalled();
  });

  it('rejects missing or foreign references in the service', async () => {
    resumes.getReferenceSummary.mockResolvedValue({
      educationCount: 0,
      workExperiences: [],
      skillCount: 0,
      professionalRoleCount: 0,
    });

    await expect(
      service.create({ user_id: userId, resume: draft({ education_ids: ['foreign-education-id'] }) }),
    ).rejects.toMatchObject({ kind: 'invalid_argument' });
    expect(resumes.create).not.toHaveBeenCalled();
  });

  it('checks resume ownership in the service before updating', async () => {
    resumes.ownedResumeExists.mockResolvedValue(false);

    await expect(service.update({ user_id: userId, resume_id: resumeId, resume: draft() })).rejects.toMatchObject({
      kind: 'not_found',
    });
    expect(resumes.getReferenceSummary).not.toHaveBeenCalled();
    expect(resumes.update).not.toHaveBeenCalled();
  });

  it('requires a profile before publishing in the service', async () => {
    resumes.profileExists.mockResolvedValue(false);

    await expect(
      service.setStatus({
        user_id: userId,
        resume_id: resumeId,
        status: ResumeStatus.RESUME_STATUS_PUBLISHED,
      }),
    ).rejects.toMatchObject({ kind: 'failed_precondition' });
    expect(resumes.setStatus).not.toHaveBeenCalled();
  });
});

function draft(overrides: Partial<ResumeDraft> = {}): ResumeDraft {
  return {
    title: ' Backend developer ',
    visibility: ResumeVisibility.RESUME_VISIBILITY_REGISTERED_EMPLOYERS,
    search_status: SearchStatus.SEARCH_STATUS_ACTIVE_SEARCH,
    employment_types: [],
    work_schedules: [],
    work_formats: [],
    education_ids: [],
    work_experience_ids: [],
    skill_ids: [],
    professional_role_ids: [],
    certificates: [],
    ...overrides,
  };
}

function resumeRecord(overrides: Partial<ResumeRecord> = {}): ResumeRecord {
  const now = new Date('2026-08-26T12:00:00.000Z');
  return {
    id: resumeId,
    userId,
    title: 'Backend developer',
    about: null,
    city: null,
    status: 'DRAFT',
    visibility: 'REGISTERED_EMPLOYERS',
    searchStatus: 'ACTIVE_SEARCH',
    businessTripReadiness: null,
    salaryAmount: null,
    salaryCurrency: null,
    totalExperienceMonths: 0,
    employmentTypes: [],
    workSchedules: [],
    workFormats: [],
    viewsCount: 0,
    impressionsCount: 0,
    invitationsCount: 0,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    educations: [],
    workExperiences: [],
    certificates: [],
    skills: [],
    professionalRoles: [],
    ...overrides,
  };
}
