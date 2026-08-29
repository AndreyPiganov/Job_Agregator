import type { Prisma } from '../../../generated/prisma/client';
import type { EducationLevel, Gender, ProficiencyLevel, RelocationReadiness } from '../../../generated/prisma/enums';
import type { educationInclude, profileInclude } from '../constants/profile.constants';

export interface ProfileWriteData {
  userId: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  birthDate: Date | null;
  gender: Gender | null;
  city: string | null;
  photoUrl: string | null;
  about: string | null;
  relocationReadiness: RelocationReadiness | null;
  languages: Array<{ code: string; proficiency: ProficiencyLevel }>;
  citizenshipCodes: string[];
  contacts: UserContactWriteData | null;
}

export interface UserContactWriteData {
  email: string | null;
  phoneNumber: string | null;
  telegramUsername: string | null;
  githubUsername: string | null;
}

export interface EducationWriteData {
  institutionName: string;
  level: EducationLevel;
  specializationId: number | null;
  faculty: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
}

export interface WorkExperienceWriteData {
  companyName: string;
  position: string;
  description: string | null;
  city: string | null;
  companyUrl: string | null;
  startedAt: Date;
  endedAt: Date | null;
}

export type ProfileRecord = Prisma.UserProfileGetPayload<{ include: typeof profileInclude }>;
export type EducationRecord = Prisma.EducationGetPayload<{ include: typeof educationInclude }>;
export type WorkExperienceRecord = Prisma.WorkExperienceGetPayload<Record<string, never>>;
