import { Injectable } from '@nestjs/common';
import { UserApplicationError } from '../errors/user-application.error';
import {
  BusinessTripReadiness as PrismaBusinessTripReadiness,
  EducationLevel as PrismaEducationLevel,
  EmploymentType as PrismaEmploymentType,
  Gender as PrismaGender,
  ProficiencyLevel as PrismaProficiencyLevel,
  RelocationReadiness as PrismaRelocationReadiness,
  ResumeStatus as PrismaResumeStatus,
  ResumeVisibility as PrismaResumeVisibility,
  SearchStatus as PrismaSearchStatus,
  WorkFormat as PrismaWorkFormat,
  WorkSchedule as PrismaWorkSchedule,
} from '../../generated/prisma/enums';
import {
  BusinessTripReadiness,
  EducationLevel,
  EmploymentType,
  Gender,
  ProficiencyLevel,
  RelocationReadiness,
  ResumeStatus,
  ResumeVisibility,
  SearchStatus,
  WorkFormat,
  WorkSchedule,
} from '../../generated/user/v1/user';

function genderFromGrpc(value: Gender): PrismaGender {
  switch (value) {
    case Gender.GENDER_MALE:
      return 'MALE';
    case Gender.GENDER_FEMALE:
      return 'FEMALE';
    default:
      throw invalidEnum('gender');
  }
}

function genderToGrpc(value: PrismaGender): Gender {
  return value === 'MALE' ? Gender.GENDER_MALE : Gender.GENDER_FEMALE;
}

function relocationFromGrpc(value: RelocationReadiness): PrismaRelocationReadiness {
  switch (value) {
    case RelocationReadiness.RELOCATION_READINESS_NOT_READY:
      return 'NOT_READY';
    case RelocationReadiness.RELOCATION_READINESS_POSSIBLE:
      return 'POSSIBLE';
    case RelocationReadiness.RELOCATION_READINESS_READY:
      return 'READY';
    default:
      throw invalidEnum('relocation_readiness');
  }
}

function relocationToGrpc(value: PrismaRelocationReadiness): RelocationReadiness {
  switch (value) {
    case 'NOT_READY':
      return RelocationReadiness.RELOCATION_READINESS_NOT_READY;
    case 'POSSIBLE':
      return RelocationReadiness.RELOCATION_READINESS_POSSIBLE;
    case 'READY':
      return RelocationReadiness.RELOCATION_READINESS_READY;
  }
}

function proficiencyFromGrpc(value: ProficiencyLevel): PrismaProficiencyLevel {
  const mapped = proficiencyEntries.find((entry) => entry.grpc === value)?.prisma;
  if (!mapped) throw invalidEnum('proficiency');
  return mapped;
}

function proficiencyToGrpc(value: PrismaProficiencyLevel): ProficiencyLevel {
  return proficiencyEntries.find((entry) => entry.prisma === value)?.grpc ?? ProficiencyLevel.UNRECOGNIZED;
}

const proficiencyEntries: ReadonlyArray<{ prisma: PrismaProficiencyLevel; grpc: ProficiencyLevel }> = [
  { prisma: 'BEGINNER_A1', grpc: ProficiencyLevel.PROFICIENCY_LEVEL_BEGINNER_A1 },
  { prisma: 'ELEMENTARY_A2', grpc: ProficiencyLevel.PROFICIENCY_LEVEL_ELEMENTARY_A2 },
  { prisma: 'INTERMEDIATE_B1', grpc: ProficiencyLevel.PROFICIENCY_LEVEL_INTERMEDIATE_B1 },
  { prisma: 'UPPER_INTERMEDIATE_B2', grpc: ProficiencyLevel.PROFICIENCY_LEVEL_UPPER_INTERMEDIATE_B2 },
  { prisma: 'ADVANCED_C1', grpc: ProficiencyLevel.PROFICIENCY_LEVEL_ADVANCED_C1 },
  { prisma: 'NATIVE_C2', grpc: ProficiencyLevel.PROFICIENCY_LEVEL_NATIVE_C2 },
];

function educationLevelFromGrpc(value: EducationLevel): PrismaEducationLevel {
  const mapped = educationLevelEntries.find((entry) => entry.grpc === value)?.prisma;
  if (!mapped) throw invalidEnum('education.level');
  return mapped;
}

function educationLevelToGrpc(value: PrismaEducationLevel): EducationLevel {
  return educationLevelEntries.find((entry) => entry.prisma === value)?.grpc ?? EducationLevel.UNRECOGNIZED;
}

const educationLevelEntries: ReadonlyArray<{ prisma: PrismaEducationLevel; grpc: EducationLevel }> = [
  { prisma: 'SECONDARY', grpc: EducationLevel.EDUCATION_LEVEL_SECONDARY },
  { prisma: 'SPECIAL_SECONDARY', grpc: EducationLevel.EDUCATION_LEVEL_SPECIAL_SECONDARY },
  { prisma: 'UNFINISHED_HIGHER', grpc: EducationLevel.EDUCATION_LEVEL_UNFINISHED_HIGHER },
  { prisma: 'BACHELOR', grpc: EducationLevel.EDUCATION_LEVEL_BACHELOR },
  { prisma: 'MASTER', grpc: EducationLevel.EDUCATION_LEVEL_MASTER },
  { prisma: 'HIGHER', grpc: EducationLevel.EDUCATION_LEVEL_HIGHER },
  { prisma: 'PHD', grpc: EducationLevel.EDUCATION_LEVEL_PHD },
];

function resumeStatusFromGrpc(value: ResumeStatus): PrismaResumeStatus {
  switch (value) {
    case ResumeStatus.RESUME_STATUS_DRAFT:
      return 'DRAFT';
    case ResumeStatus.RESUME_STATUS_PUBLISHED:
      return 'PUBLISHED';
    case ResumeStatus.RESUME_STATUS_ARCHIVED:
      return 'ARCHIVED';
    default:
      throw invalidEnum('status');
  }
}

function resumeStatusToGrpc(value: PrismaResumeStatus): ResumeStatus {
  switch (value) {
    case 'DRAFT':
      return ResumeStatus.RESUME_STATUS_DRAFT;
    case 'PUBLISHED':
      return ResumeStatus.RESUME_STATUS_PUBLISHED;
    case 'ARCHIVED':
      return ResumeStatus.RESUME_STATUS_ARCHIVED;
  }
}

function visibilityFromGrpc(value: ResumeVisibility): PrismaResumeVisibility {
  switch (value) {
    case ResumeVisibility.RESUME_VISIBILITY_PUBLIC:
      return 'PUBLIC';
    case ResumeVisibility.RESUME_VISIBILITY_REGISTERED_EMPLOYERS:
      return 'REGISTERED_EMPLOYERS';
    case ResumeVisibility.RESUME_VISIBILITY_PRIVATE:
      return 'PRIVATE';
    default:
      throw invalidEnum('visibility');
  }
}

function visibilityToGrpc(value: PrismaResumeVisibility): ResumeVisibility {
  switch (value) {
    case 'PUBLIC':
      return ResumeVisibility.RESUME_VISIBILITY_PUBLIC;
    case 'REGISTERED_EMPLOYERS':
      return ResumeVisibility.RESUME_VISIBILITY_REGISTERED_EMPLOYERS;
    case 'PRIVATE':
      return ResumeVisibility.RESUME_VISIBILITY_PRIVATE;
  }
}

function searchStatusFromGrpc(value: SearchStatus): PrismaSearchStatus {
  switch (value) {
    case SearchStatus.SEARCH_STATUS_ACTIVE_SEARCH:
      return 'ACTIVE_SEARCH';
    case SearchStatus.SEARCH_STATUS_OPEN_TO_OFFERS:
      return 'OPEN_TO_OFFERS';
    case SearchStatus.SEARCH_STATUS_NOT_SEARCHING:
      return 'NOT_SEARCHING';
    case SearchStatus.SEARCH_STATUS_FOUND_JOB:
      return 'FOUND_JOB';
    default:
      throw invalidEnum('search_status');
  }
}

function searchStatusToGrpc(value: PrismaSearchStatus): SearchStatus {
  switch (value) {
    case 'ACTIVE_SEARCH':
      return SearchStatus.SEARCH_STATUS_ACTIVE_SEARCH;
    case 'OPEN_TO_OFFERS':
      return SearchStatus.SEARCH_STATUS_OPEN_TO_OFFERS;
    case 'NOT_SEARCHING':
      return SearchStatus.SEARCH_STATUS_NOT_SEARCHING;
    case 'FOUND_JOB':
      return SearchStatus.SEARCH_STATUS_FOUND_JOB;
  }
}

function businessTripFromGrpc(value: BusinessTripReadiness): PrismaBusinessTripReadiness {
  switch (value) {
    case BusinessTripReadiness.BUSINESS_TRIP_READINESS_NEVER:
      return 'NEVER';
    case BusinessTripReadiness.BUSINESS_TRIP_READINESS_SOMETIMES:
      return 'SOMETIMES';
    case BusinessTripReadiness.BUSINESS_TRIP_READINESS_READY:
      return 'READY';
    default:
      throw invalidEnum('business_trip_readiness');
  }
}

function businessTripToGrpc(value: PrismaBusinessTripReadiness): BusinessTripReadiness {
  switch (value) {
    case 'NEVER':
      return BusinessTripReadiness.BUSINESS_TRIP_READINESS_NEVER;
    case 'SOMETIMES':
      return BusinessTripReadiness.BUSINESS_TRIP_READINESS_SOMETIMES;
    case 'READY':
      return BusinessTripReadiness.BUSINESS_TRIP_READINESS_READY;
  }
}

function employmentTypeFromGrpc(value: EmploymentType): PrismaEmploymentType {
  const mapped = employmentTypeEntries.find((entry) => entry.grpc === value)?.prisma;
  if (!mapped) throw invalidEnum('employment_types');
  return mapped;
}

function employmentTypeToGrpc(value: PrismaEmploymentType): EmploymentType {
  return employmentTypeEntries.find((entry) => entry.prisma === value)?.grpc ?? EmploymentType.UNRECOGNIZED;
}

const employmentTypeEntries: ReadonlyArray<{ prisma: PrismaEmploymentType; grpc: EmploymentType }> = [
  { prisma: 'FULL_TIME', grpc: EmploymentType.EMPLOYMENT_TYPE_FULL_TIME },
  { prisma: 'PART_TIME', grpc: EmploymentType.EMPLOYMENT_TYPE_PART_TIME },
  { prisma: 'PROJECT', grpc: EmploymentType.EMPLOYMENT_TYPE_PROJECT },
  { prisma: 'INTERNSHIP', grpc: EmploymentType.EMPLOYMENT_TYPE_INTERNSHIP },
  { prisma: 'TEMPORARY', grpc: EmploymentType.EMPLOYMENT_TYPE_TEMPORARY },
  { prisma: 'VOLUNTEER', grpc: EmploymentType.EMPLOYMENT_TYPE_VOLUNTEER },
];

function workScheduleFromGrpc(value: WorkSchedule): PrismaWorkSchedule {
  const mapped = workScheduleEntries.find((entry) => entry.grpc === value)?.prisma;
  if (!mapped) throw invalidEnum('work_schedules');
  return mapped;
}

function workScheduleToGrpc(value: PrismaWorkSchedule): WorkSchedule {
  return workScheduleEntries.find((entry) => entry.prisma === value)?.grpc ?? WorkSchedule.UNRECOGNIZED;
}

const workScheduleEntries: ReadonlyArray<{ prisma: PrismaWorkSchedule; grpc: WorkSchedule }> = [
  { prisma: 'FULL_DAY', grpc: WorkSchedule.WORK_SCHEDULE_FULL_DAY },
  { prisma: 'SHIFT', grpc: WorkSchedule.WORK_SCHEDULE_SHIFT },
  { prisma: 'FLEXIBLE', grpc: WorkSchedule.WORK_SCHEDULE_FLEXIBLE },
  { prisma: 'ROTATION', grpc: WorkSchedule.WORK_SCHEDULE_ROTATION },
];

function workFormatFromGrpc(value: WorkFormat): PrismaWorkFormat {
  const mapped = workFormatEntries.find((entry) => entry.grpc === value)?.prisma;
  if (!mapped) throw invalidEnum('work_formats');
  return mapped;
}

function workFormatToGrpc(value: PrismaWorkFormat): WorkFormat {
  return workFormatEntries.find((entry) => entry.prisma === value)?.grpc ?? WorkFormat.UNRECOGNIZED;
}

const workFormatEntries: ReadonlyArray<{ prisma: PrismaWorkFormat; grpc: WorkFormat }> = [
  { prisma: 'ONSITE', grpc: WorkFormat.WORK_FORMAT_ONSITE },
  { prisma: 'REMOTE', grpc: WorkFormat.WORK_FORMAT_REMOTE },
  { prisma: 'HYBRID', grpc: WorkFormat.WORK_FORMAT_HYBRID },
  { prisma: 'FIELD', grpc: WorkFormat.WORK_FORMAT_FIELD },
];

function invalidEnum(field: string): UserApplicationError {
  return UserApplicationError.invalidArgument(`${field} contains an unsupported value`);
}

@Injectable()
export class UserEnumMapper {
  genderFromGrpc(value: Gender): PrismaGender {
    return genderFromGrpc(value);
  }

  genderToGrpc(value: PrismaGender): Gender {
    return genderToGrpc(value);
  }

  relocationFromGrpc(value: RelocationReadiness): PrismaRelocationReadiness {
    return relocationFromGrpc(value);
  }

  relocationToGrpc(value: PrismaRelocationReadiness): RelocationReadiness {
    return relocationToGrpc(value);
  }

  proficiencyFromGrpc(value: ProficiencyLevel): PrismaProficiencyLevel {
    return proficiencyFromGrpc(value);
  }

  proficiencyToGrpc(value: PrismaProficiencyLevel): ProficiencyLevel {
    return proficiencyToGrpc(value);
  }

  educationLevelFromGrpc(value: EducationLevel): PrismaEducationLevel {
    return educationLevelFromGrpc(value);
  }

  educationLevelToGrpc(value: PrismaEducationLevel): EducationLevel {
    return educationLevelToGrpc(value);
  }

  resumeStatusFromGrpc(value: ResumeStatus): PrismaResumeStatus {
    return resumeStatusFromGrpc(value);
  }

  resumeStatusToGrpc(value: PrismaResumeStatus): ResumeStatus {
    return resumeStatusToGrpc(value);
  }

  visibilityFromGrpc(value: ResumeVisibility): PrismaResumeVisibility {
    return visibilityFromGrpc(value);
  }

  visibilityToGrpc(value: PrismaResumeVisibility): ResumeVisibility {
    return visibilityToGrpc(value);
  }

  searchStatusFromGrpc(value: SearchStatus): PrismaSearchStatus {
    return searchStatusFromGrpc(value);
  }

  searchStatusToGrpc(value: PrismaSearchStatus): SearchStatus {
    return searchStatusToGrpc(value);
  }

  businessTripFromGrpc(value: BusinessTripReadiness): PrismaBusinessTripReadiness {
    return businessTripFromGrpc(value);
  }

  businessTripToGrpc(value: PrismaBusinessTripReadiness): BusinessTripReadiness {
    return businessTripToGrpc(value);
  }

  employmentTypeFromGrpc(value: EmploymentType): PrismaEmploymentType {
    return employmentTypeFromGrpc(value);
  }

  employmentTypeToGrpc(value: PrismaEmploymentType): EmploymentType {
    return employmentTypeToGrpc(value);
  }

  workScheduleFromGrpc(value: WorkSchedule): PrismaWorkSchedule {
    return workScheduleFromGrpc(value);
  }

  workScheduleToGrpc(value: PrismaWorkSchedule): WorkSchedule {
    return workScheduleToGrpc(value);
  }

  workFormatFromGrpc(value: WorkFormat): PrismaWorkFormat {
    return workFormatFromGrpc(value);
  }

  workFormatToGrpc(value: PrismaWorkFormat): WorkFormat {
    return workFormatToGrpc(value);
  }
}
