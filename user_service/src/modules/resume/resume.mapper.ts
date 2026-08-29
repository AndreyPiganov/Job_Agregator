import { Injectable } from '@nestjs/common';
import { UserApplicationError } from '../../common/errors/user-application.error';
import { UserEnumMapper } from '../../common/mappers/user-enum.mapper';
import {
  formatDateOnly,
  parseOptionalDate,
  timestampFromDate,
  timestampFromOptionalDate,
} from '../../common/utils/date';
import { canonicalizeOptionalText, canonicalizeText } from '../../common/utils/text';
import { Resume, ResumeDraft, ResumeStatus, ResumeVisibility, SearchStatus } from '../../generated/user/v1/user';
import { ProfileMapper } from '../profile/profile.mapper';
import type { ResumeRecord, ResumeWriteData } from './interfaces/resume.interfaces';

@Injectable()
export class ResumeMapper {
  constructor(
    private readonly enums: UserEnumMapper,
    private readonly profiles: ProfileMapper,
  ) {}

  toWriteData(draft: ResumeDraft): ResumeWriteData {
    const hasSalaryAmount = draft.salary_amount !== undefined;
    const hasSalaryCurrency = draft.salary_currency !== undefined;
    if (hasSalaryAmount !== hasSalaryCurrency) {
      throw UserApplicationError.invalidArgument('salary_amount and salary_currency must be specified together');
    }

    return {
      title: canonicalizeText(draft.title),
      about: canonicalizeOptionalText(draft.about),
      city: canonicalizeOptionalText(draft.city),
      visibility:
        draft.visibility === undefined
          ? this.enums.visibilityFromGrpc(ResumeVisibility.RESUME_VISIBILITY_REGISTERED_EMPLOYERS)
          : this.enums.visibilityFromGrpc(draft.visibility),
      searchStatus:
        draft.search_status === undefined
          ? this.enums.searchStatusFromGrpc(SearchStatus.SEARCH_STATUS_ACTIVE_SEARCH)
          : this.enums.searchStatusFromGrpc(draft.search_status),
      businessTripReadiness:
        draft.business_trip_readiness === undefined
          ? null
          : this.enums.businessTripFromGrpc(draft.business_trip_readiness),
      salaryAmount: hasSalaryAmount ? draft.salary_amount : null,
      salaryCurrency: hasSalaryCurrency ? canonicalizeCurrency(draft.salary_currency) : null,
      employmentTypes: draft.employment_types.map((value) => this.enums.employmentTypeFromGrpc(value)),
      workSchedules: draft.work_schedules.map((value) => this.enums.workScheduleFromGrpc(value)),
      workFormats: draft.work_formats.map((value) => this.enums.workFormatFromGrpc(value)),
      educationIds: draft.education_ids,
      workExperienceIds: draft.work_experience_ids,
      skillIds: draft.skill_ids,
      professionalRoleIds: draft.professional_role_ids,
      certificates: draft.certificates.map((certificate) => ({
        title: canonicalizeText(certificate.title),
        issuer: canonicalizeOptionalText(certificate.issuer),
        url: optionalUrl(certificate.url, 'certificates.url'),
        achievedAt: parseOptionalDate(certificate.achieved_at, 'certificates.achieved_at'),
      })),
    };
  }

  statusFromGrpc(status: ResumeStatus) {
    return this.enums.resumeStatusFromGrpc(status);
  }

  toGrpc(resume: ResumeRecord): Resume {
    return {
      id: resume.id,
      user_id: resume.userId,
      title: resume.title,
      about: resume.about ?? undefined,
      city: resume.city ?? undefined,
      status: this.enums.resumeStatusToGrpc(resume.status),
      visibility: this.enums.visibilityToGrpc(resume.visibility),
      search_status: this.enums.searchStatusToGrpc(resume.searchStatus),
      business_trip_readiness: resume.businessTripReadiness
        ? this.enums.businessTripToGrpc(resume.businessTripReadiness)
        : undefined,
      salary_amount: resume.salaryAmount ?? undefined,
      salary_currency: resume.salaryCurrency ?? undefined,
      total_experience_months: resume.totalExperienceMonths,
      employment_types: resume.employmentTypes.map((value) => this.enums.employmentTypeToGrpc(value)),
      work_schedules: resume.workSchedules.map((value) => this.enums.workScheduleToGrpc(value)),
      work_formats: resume.workFormats.map((value) => this.enums.workFormatToGrpc(value)),
      views_count: resume.viewsCount,
      impressions_count: resume.impressionsCount,
      invitations_count: resume.invitationsCount,
      educations: resume.educations.map((entry) => this.profiles.educationToGrpc(entry.education)),
      work_experiences: resume.workExperiences.map((entry) => this.profiles.workExperienceToGrpc(entry.workExperience)),
      certificates: resume.certificates.map((certificate) => ({
        id: certificate.id,
        title: certificate.title,
        issuer: certificate.issuer ?? undefined,
        url: certificate.url ?? undefined,
        achieved_at: formatDateOnly(certificate.achievedAt),
      })),
      skills: resume.skills.map((entry) => ({ id: entry.skill.id, name: entry.skill.name })),
      professional_roles: resume.professionalRoles.map((entry) => ({
        id: entry.professionalRole.id,
        name: entry.professionalRole.name,
      })),
      published_at: timestampFromOptionalDate(resume.publishedAt),
      created_at: timestampFromDate(resume.createdAt),
      updated_at: timestampFromDate(resume.updatedAt),
    };
  }
}

function optionalUrl(value: string | undefined, field: string): string | null {
  const normalized = canonicalizeOptionalText(value);
  if (normalized === null) return null;

  try {
    const url = new URL(normalized);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('unsupported protocol');
  } catch {
    throw UserApplicationError.invalidArgument(`${field} must be a valid HTTP(S) URL`);
  }
  return normalized;
}

function canonicalizeCurrency(value: string | undefined): string {
  return value?.trim().toUpperCase() ?? '';
}
