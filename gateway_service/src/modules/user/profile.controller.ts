import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthPrincipal, AuthenticatedRequest } from '../auth/interfaces/auth.interfaces';
import { EducationDto, UpsertProfileDto, WorkExperienceDto } from './dto/profile.dto';
import { ProfileService } from './services/profile.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/users/me')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get the current user profile' })
  @ApiOkResponse({ description: 'Current user profile' })
  get(@Req() request: AuthenticatedRequest<AuthPrincipal>) {
    return this.profiles.get(request.user.user_id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Create or replace the current user profile' })
  @ApiOkResponse({ description: 'Updated user profile' })
  upsert(@Req() request: AuthenticatedRequest<AuthPrincipal>, @Body() dto: UpsertProfileDto) {
    return this.profiles.upsert(request.user.user_id, dto);
  }

  @Post('educations')
  @ApiOperation({ summary: 'Add education to the current user profile' })
  @ApiCreatedResponse({ description: 'Education created' })
  createEducation(@Req() request: AuthenticatedRequest<AuthPrincipal>, @Body() dto: EducationDto) {
    return this.profiles.createEducation(request.user.user_id, dto);
  }

  @Put('educations/:educationId')
  @ApiOperation({ summary: 'Replace education owned by the current user' })
  updateEducation(
    @Req() request: AuthenticatedRequest<AuthPrincipal>,
    @Param('educationId', new ParseUUIDPipe({ version: '4' })) educationId: string,
    @Body() dto: EducationDto,
  ) {
    return this.profiles.updateEducation(request.user.user_id, educationId, dto);
  }

  @Delete('educations/:educationId')
  @ApiOperation({ summary: 'Delete education owned by the current user' })
  deleteEducation(
    @Req() request: AuthenticatedRequest<AuthPrincipal>,
    @Param('educationId', new ParseUUIDPipe({ version: '4' })) educationId: string,
  ) {
    return this.profiles.deleteEducation(request.user.user_id, educationId);
  }

  @Post('work-experiences')
  @ApiOperation({ summary: 'Add work experience to the current user profile' })
  @ApiCreatedResponse({ description: 'Work experience created' })
  createWorkExperience(@Req() request: AuthenticatedRequest<AuthPrincipal>, @Body() dto: WorkExperienceDto) {
    return this.profiles.createWorkExperience(request.user.user_id, dto);
  }

  @Put('work-experiences/:workExperienceId')
  @ApiOperation({ summary: 'Replace work experience owned by the current user' })
  updateWorkExperience(
    @Req() request: AuthenticatedRequest<AuthPrincipal>,
    @Param('workExperienceId', new ParseUUIDPipe({ version: '4' })) workExperienceId: string,
    @Body() dto: WorkExperienceDto,
  ) {
    return this.profiles.updateWorkExperience(request.user.user_id, workExperienceId, dto);
  }

  @Delete('work-experiences/:workExperienceId')
  @ApiOperation({ summary: 'Delete work experience owned by the current user' })
  deleteWorkExperience(
    @Req() request: AuthenticatedRequest<AuthPrincipal>,
    @Param('workExperienceId', new ParseUUIDPipe({ version: '4' })) workExperienceId: string,
  ) {
    return this.profiles.deleteWorkExperience(request.user.user_id, workExperienceId);
  }
}
