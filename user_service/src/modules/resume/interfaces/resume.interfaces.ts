import type { Prisma } from '../../../generated/prisma/client';
import type {
  BusinessTripReadiness,
  EmploymentType,
  ResumeVisibility,
  SearchStatus,
  WorkFormat,
  WorkSchedule,
} from '../../../generated/prisma/enums';
import type { resumeInclude } from '../constants/resume.constants';

export interface ResumeWriteData {
  title: string;
  about: string | null;
  city: string | null;
  visibility: ResumeVisibility;
  searchStatus: SearchStatus;
  businessTripReadiness: BusinessTripReadiness | null;
  salaryAmount: number | null;
  salaryCurrency: string | null;
  employmentTypes: EmploymentType[];
  workSchedules: WorkSchedule[];
  workFormats: WorkFormat[];
  educationIds: string[];
  workExperienceIds: string[];
  skillIds: number[];
  professionalRoleIds: number[];
  certificates: Array<{
    title: string;
    issuer: string | null;
    url: string | null;
    achievedAt: Date | null;
  }>;
}

export interface WorkExperiencePeriod {
  startedAt: Date;
  endedAt: Date | null;
}

export interface ResumeReferenceSummary {
  educationCount: number;
  workExperiences: WorkExperiencePeriod[];
  skillCount: number;
  professionalRoleCount: number;
}

export type ResumeRecord = Prisma.ResumeGetPayload<{ include: typeof resumeInclude }>;
