import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  EducationInput,
  EducationLevel,
  Gender,
  LanguageInput,
  ProficiencyLevel,
  RelocationReadiness,
  UpsertUserProfileRequest,
  UserContactInput,
  WorkExperienceInput,
} from '../../../generated/user/v1/user';
import { DATE_PATTERN } from '../constants/user.constants';

export class LanguageInputDto implements LanguageInput {
  @ApiProperty({ example: 'ru', minLength: 2, maxLength: 10 })
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  code!: string;

  @ApiProperty({ enum: ProficiencyLevel, example: ProficiencyLevel.PROFICIENCY_LEVEL_NATIVE_C2 })
  @IsIn([
    ProficiencyLevel.PROFICIENCY_LEVEL_BEGINNER_A1,
    ProficiencyLevel.PROFICIENCY_LEVEL_ELEMENTARY_A2,
    ProficiencyLevel.PROFICIENCY_LEVEL_INTERMEDIATE_B1,
    ProficiencyLevel.PROFICIENCY_LEVEL_UPPER_INTERMEDIATE_B2,
    ProficiencyLevel.PROFICIENCY_LEVEL_ADVANCED_C1,
    ProficiencyLevel.PROFICIENCY_LEVEL_NATIVE_C2,
  ])
  proficiency!: ProficiencyLevel;
}

export class UserContactDto implements UserContactInput {
  @ApiPropertyOptional({ example: 'contact@example.com', maxLength: 320 })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional({ example: '+79991234567', maxLength: 20 })
  @IsOptional()
  @Matches(/^\+[1-9]\d{7,14}$/)
  phone_number?: string;

  @ApiPropertyOptional({ example: 'username', minLength: 5, maxLength: 32 })
  @IsOptional()
  @Matches(/^[A-Za-z][A-Za-z0-9_]*$/)
  @MinLength(5)
  @MaxLength(32)
  telegram_username?: string;

  @ApiPropertyOptional({ example: 'github-user', minLength: 1, maxLength: 39 })
  @IsOptional()
  @Matches(/^(?:[A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/)
  @MaxLength(39)
  github_username?: string;
}

export class UpsertProfileDto implements Omit<UpsertUserProfileRequest, 'user_id'> {
  @ApiProperty({ example: 'Иван', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name!: string;

  @ApiProperty({ example: 'Иванов', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name!: string;

  @ApiPropertyOptional({ example: 'Иванович', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  middle_name?: string;

  @ApiPropertyOptional({ example: '1995-05-20', pattern: '^\\d{4}-\\d{2}-\\d{2}$' })
  @IsOptional()
  @Matches(DATE_PATTERN)
  birth_date?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsIn([Gender.GENDER_MALE, Gender.GENDER_FEMALE])
  gender?: Gender;

  @ApiPropertyOptional({ example: 'Москва', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg', maxLength: 2048 })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  photo_url?: string;

  @ApiPropertyOptional({ maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  about?: string;

  @ApiPropertyOptional({ enum: RelocationReadiness })
  @IsOptional()
  @IsIn([
    RelocationReadiness.RELOCATION_READINESS_NOT_READY,
    RelocationReadiness.RELOCATION_READINESS_POSSIBLE,
    RelocationReadiness.RELOCATION_READINESS_READY,
  ])
  relocation_readiness?: RelocationReadiness;

  @ApiProperty({ type: [LanguageInputDto], maxItems: 20, default: [] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => LanguageInputDto)
  languages: LanguageInputDto[] = [];

  @ApiProperty({ type: [String], example: ['RU'], maxItems: 20, default: [] })
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @Matches(/^[A-Z]{2}$/, { each: true })
  citizenship_codes: string[] = [];

  @ApiPropertyOptional({ type: UserContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserContactDto)
  contacts?: UserContactDto;
}

export class EducationDto implements EducationInput {
  @ApiProperty({ example: 'МГТУ им. Н. Э. Баумана', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  institution_name!: string;

  @ApiProperty({ enum: EducationLevel })
  @IsIn([
    EducationLevel.EDUCATION_LEVEL_SECONDARY,
    EducationLevel.EDUCATION_LEVEL_SPECIAL_SECONDARY,
    EducationLevel.EDUCATION_LEVEL_UNFINISHED_HIGHER,
    EducationLevel.EDUCATION_LEVEL_BACHELOR,
    EducationLevel.EDUCATION_LEVEL_MASTER,
    EducationLevel.EDUCATION_LEVEL_HIGHER,
    EducationLevel.EDUCATION_LEVEL_PHD,
  ])
  level!: EducationLevel;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  specialization_id?: number;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  faculty?: string;

  @ApiPropertyOptional({ example: '2014-09-01' })
  @IsOptional()
  @Matches(DATE_PATTERN)
  started_at?: string;

  @ApiPropertyOptional({ example: '2018-06-30' })
  @IsOptional()
  @Matches(DATE_PATTERN)
  ended_at?: string;
}

export class WorkExperienceDto implements WorkExperienceInput {
  @ApiProperty({ example: 'ООО Компания', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  company_name!: string;

  @ApiProperty({ example: 'Backend-разработчик', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  position!: string;

  @ApiPropertyOptional({ maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ maxLength: 2048 })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  company_url?: string;

  @ApiProperty({ example: '2020-01-01' })
  @Matches(DATE_PATTERN)
  started_at!: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @Matches(DATE_PATTERN)
  ended_at?: string;
}
