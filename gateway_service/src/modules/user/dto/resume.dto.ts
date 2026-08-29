import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  BusinessTripReadiness,
  CertificateInput,
  EmploymentType,
  ResumeDraft,
  ResumeStatus,
  ResumeVisibility,
  SearchStatus,
  WorkFormat,
  WorkSchedule,
} from '../../../generated/user/v1/user';
import { DATE_PATTERN } from '../constants/user.constants';

export class CertificateDto implements CertificateInput {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuer?: string;

  @ApiPropertyOptional({ maxLength: 2048 })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  url?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @Matches(DATE_PATTERN)
  achieved_at?: string;
}

export class ResumeDto implements ResumeDraft {
  @ApiProperty({ example: 'Backend-разработчик', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  about?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ enum: ResumeVisibility })
  @IsOptional()
  @IsIn([
    ResumeVisibility.RESUME_VISIBILITY_PUBLIC,
    ResumeVisibility.RESUME_VISIBILITY_REGISTERED_EMPLOYERS,
    ResumeVisibility.RESUME_VISIBILITY_PRIVATE,
  ])
  visibility?: ResumeVisibility;

  @ApiPropertyOptional({ enum: SearchStatus })
  @IsOptional()
  @IsIn([
    SearchStatus.SEARCH_STATUS_ACTIVE_SEARCH,
    SearchStatus.SEARCH_STATUS_OPEN_TO_OFFERS,
    SearchStatus.SEARCH_STATUS_NOT_SEARCHING,
    SearchStatus.SEARCH_STATUS_FOUND_JOB,
  ])
  search_status?: SearchStatus;

  @ApiPropertyOptional({ enum: BusinessTripReadiness })
  @IsOptional()
  @IsIn([
    BusinessTripReadiness.BUSINESS_TRIP_READINESS_NEVER,
    BusinessTripReadiness.BUSINESS_TRIP_READINESS_SOMETIMES,
    BusinessTripReadiness.BUSINESS_TRIP_READINESS_READY,
  ])
  business_trip_readiness?: BusinessTripReadiness;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  salary_amount?: number;

  @ApiPropertyOptional({ example: 'RUB', minLength: 3, maxLength: 3 })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  salary_currency?: string;

  @ApiProperty({ enum: EmploymentType, isArray: true, default: [] })
  @IsArray()
  @ArrayMaxSize(6)
  @ArrayUnique()
  @IsIn(
    [
      EmploymentType.EMPLOYMENT_TYPE_FULL_TIME,
      EmploymentType.EMPLOYMENT_TYPE_PART_TIME,
      EmploymentType.EMPLOYMENT_TYPE_PROJECT,
      EmploymentType.EMPLOYMENT_TYPE_INTERNSHIP,
      EmploymentType.EMPLOYMENT_TYPE_TEMPORARY,
      EmploymentType.EMPLOYMENT_TYPE_VOLUNTEER,
    ],
    { each: true },
  )
  employment_types: EmploymentType[] = [];

  @ApiProperty({ enum: WorkSchedule, isArray: true, default: [] })
  @IsArray()
  @ArrayMaxSize(4)
  @ArrayUnique()
  @IsIn(
    [
      WorkSchedule.WORK_SCHEDULE_FULL_DAY,
      WorkSchedule.WORK_SCHEDULE_SHIFT,
      WorkSchedule.WORK_SCHEDULE_FLEXIBLE,
      WorkSchedule.WORK_SCHEDULE_ROTATION,
    ],
    { each: true },
  )
  work_schedules: WorkSchedule[] = [];

  @ApiProperty({ enum: WorkFormat, isArray: true, default: [] })
  @IsArray()
  @ArrayMaxSize(4)
  @ArrayUnique()
  @IsIn(
    [
      WorkFormat.WORK_FORMAT_ONSITE,
      WorkFormat.WORK_FORMAT_REMOTE,
      WorkFormat.WORK_FORMAT_HYBRID,
      WorkFormat.WORK_FORMAT_FIELD,
    ],
    { each: true },
  )
  work_formats: WorkFormat[] = [];

  @ApiProperty({ type: [String], default: [] })
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  education_ids: string[] = [];

  @ApiProperty({ type: [String], default: [] })
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  work_experience_ids: string[] = [];

  @ApiProperty({ type: [Number], default: [] })
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  skill_ids: number[] = [];

  @ApiProperty({ type: [Number], default: [] })
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  professional_role_ids: number[] = [];

  @ApiProperty({ type: [CertificateDto], default: [] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CertificateDto)
  certificates: CertificateDto[] = [];
}

export class SetResumeStatusDto {
  @ApiProperty({ enum: ResumeStatus })
  @IsIn([ResumeStatus.RESUME_STATUS_DRAFT, ResumeStatus.RESUME_STATUS_PUBLISHED, ResumeStatus.RESUME_STATUS_ARCHIVED])
  status!: ResumeStatus;
}
