import { Injectable } from '@nestjs/common';
import { UserApplicationError } from '../../common/errors/user-application.error';
import { UserEnumMapper } from '../../common/mappers/user-enum.mapper';
import { formatDateOnly, parseOptionalDate, parseRequiredDate, timestampFromDate } from '../../common/utils/date';
import { canonicalizeOptionalText, canonicalizeText } from '../../common/utils/text';
import {
  Education,
  EducationInput,
  UpsertUserProfileRequest,
  UserProfile,
  WorkExperience,
  WorkExperienceInput,
} from '../../generated/user/v1/user';
import type {
  EducationRecord,
  EducationWriteData,
  ProfileRecord,
  ProfileWriteData,
  WorkExperienceRecord,
  WorkExperienceWriteData,
} from './interfaces/profile.interfaces';

@Injectable()
export class ProfileMapper {
  constructor(private readonly enums: UserEnumMapper) {}

  toWriteData(request: UpsertUserProfileRequest): ProfileWriteData {
    return {
      userId: request.user_id,
      firstName: canonicalizeText(request.first_name),
      lastName: canonicalizeText(request.last_name),
      middleName: canonicalizeOptionalText(request.middle_name),
      birthDate: parseOptionalDate(request.birth_date, 'birth_date'),
      gender: request.gender === undefined ? null : this.enums.genderFromGrpc(request.gender),
      city: canonicalizeOptionalText(request.city),
      photoUrl: canonicalizeOptionalText(request.photo_url),
      about: canonicalizeOptionalText(request.about),
      relocationReadiness:
        request.relocation_readiness === undefined ? null : this.enums.relocationFromGrpc(request.relocation_readiness),
      languages: request.languages.map((language) => ({
        code: canonicalizeText(language.code).toLowerCase(),
        proficiency: this.enums.proficiencyFromGrpc(language.proficiency),
      })),
      citizenshipCodes: request.citizenship_codes.map((code) => canonicalizeText(code).toUpperCase()),
      contacts: contactWriteData(request.contacts),
    };
  }

  educationToWriteData(input: EducationInput): EducationWriteData {
    const startedAt = parseOptionalDate(input.started_at, 'education.started_at');
    const endedAt = parseOptionalDate(input.ended_at, 'education.ended_at');
    ensureDateOrder(startedAt, endedAt, 'education');

    return {
      institutionName: canonicalizeText(input.institution_name),
      level: this.enums.educationLevelFromGrpc(input.level),
      specializationId: input.specialization_id ?? null,
      faculty: canonicalizeOptionalText(input.faculty),
      startedAt,
      endedAt,
    };
  }

  workExperienceToWriteData(input: WorkExperienceInput): WorkExperienceWriteData {
    const startedAt = parseRequiredDate(input.started_at, 'work_experience.started_at');
    const endedAt = parseOptionalDate(input.ended_at, 'work_experience.ended_at');
    ensureDateOrder(startedAt, endedAt, 'work_experience');

    return {
      companyName: canonicalizeText(input.company_name),
      position: canonicalizeText(input.position),
      description: canonicalizeOptionalText(input.description),
      city: canonicalizeOptionalText(input.city),
      companyUrl: canonicalizeOptionalText(input.company_url),
      startedAt,
      endedAt,
    };
  }

  toGrpc(profile: ProfileRecord): UserProfile {
    return {
      user_id: profile.userId,
      first_name: profile.firstName,
      last_name: profile.lastName,
      middle_name: profile.middleName ?? undefined,
      birth_date: formatDateOnly(profile.birthDate),
      gender: profile.gender ? this.enums.genderToGrpc(profile.gender) : undefined,
      city: profile.city ?? undefined,
      photo_url: profile.photoUrl ?? undefined,
      about: profile.about ?? undefined,
      relocation_readiness: profile.relocationReadiness
        ? this.enums.relocationToGrpc(profile.relocationReadiness)
        : undefined,
      contacts: profile.user.contact
        ? {
            email: profile.user.contact.email ?? undefined,
            phone_number: profile.user.contact.phoneNumber ?? undefined,
            telegram_username: profile.user.contact.telegramUsername ?? undefined,
            github_username: profile.user.contact.githubUsername ?? undefined,
          }
        : undefined,
      languages: profile.languages.map((entry) => ({
        code: entry.languageCode,
        name: entry.language.name,
        proficiency: this.enums.proficiencyToGrpc(entry.proficiency),
      })),
      citizenships: profile.citizenships.map((entry) => ({
        country_code: entry.countryCode,
        country_name: entry.country.name,
      })),
      educations: profile.educations.map((education) => this.educationToGrpc(education)),
      work_experiences: profile.experiences.map((experience) => this.workExperienceToGrpc(experience)),
      created_at: timestampFromDate(profile.createdAt),
      updated_at: timestampFromDate(profile.updatedAt),
    };
  }

  educationToGrpc(education: EducationRecord): Education {
    return {
      id: education.id,
      institution_name: education.institutionName,
      level: this.enums.educationLevelToGrpc(education.level),
      specialization: education.specialization
        ? { id: education.specialization.id, name: education.specialization.name }
        : undefined,
      faculty: education.faculty ?? undefined,
      started_at: formatDateOnly(education.startedAt),
      ended_at: formatDateOnly(education.endedAt),
      created_at: timestampFromDate(education.createdAt),
      updated_at: timestampFromDate(education.updatedAt),
    };
  }

  workExperienceToGrpc(workExperience: WorkExperienceRecord): WorkExperience {
    return {
      id: workExperience.id,
      company_name: workExperience.companyName,
      position: workExperience.position,
      description: workExperience.description ?? undefined,
      city: workExperience.city ?? undefined,
      company_url: workExperience.companyUrl ?? undefined,
      started_at: formatDateOnly(workExperience.startedAt) ?? '',
      ended_at: formatDateOnly(workExperience.endedAt),
      created_at: timestampFromDate(workExperience.createdAt),
      updated_at: timestampFromDate(workExperience.updatedAt),
    };
  }
}

function contactWriteData(contacts: UpsertUserProfileRequest['contacts']): ProfileWriteData['contacts'] {
  if (!contacts) return null;

  const normalized = {
    email: canonicalizeOptionalText(contacts.email)?.toLowerCase() ?? null,
    phoneNumber: canonicalizeOptionalText(contacts.phone_number),
    telegramUsername: canonicalizeOptionalText(contacts.telegram_username)?.toLowerCase() ?? null,
    githubUsername: canonicalizeOptionalText(contacts.github_username)?.toLowerCase() ?? null,
  };

  return Object.values(normalized).some((value) => value !== null) ? normalized : null;
}

function ensureDateOrder(startedAt: Date | null, endedAt: Date | null, field: string): void {
  if (startedAt && endedAt && endedAt < startedAt) {
    throw UserApplicationError.invalidArgument(`${field}.ended_at must not be earlier than started_at`);
  }
}
