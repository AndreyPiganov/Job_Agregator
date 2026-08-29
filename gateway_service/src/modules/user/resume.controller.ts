import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthPrincipal, AuthenticatedRequest } from '../auth/interfaces/auth.interfaces';
import { ResumeDto, SetResumeStatusDto } from './dto/resume.dto';
import { ResumeService } from './services/resume.service';

@ApiTags('resumes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/users/me/resumes')
export class ResumeController {
  constructor(private readonly resumes: ResumeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a resume for the current user' })
  @ApiCreatedResponse({ description: 'Resume created' })
  create(@Req() request: AuthenticatedRequest<AuthPrincipal>, @Body() dto: ResumeDto) {
    return this.resumes.create(request.user.user_id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List resumes owned by the current user' })
  @ApiOkResponse({ description: 'Current user resumes' })
  list(@Req() request: AuthenticatedRequest<AuthPrincipal>) {
    return this.resumes.list(request.user.user_id);
  }

  @Get(':resumeId')
  @ApiOperation({ summary: 'Get a resume owned by the current user' })
  get(
    @Req() request: AuthenticatedRequest<AuthPrincipal>,
    @Param('resumeId', new ParseUUIDPipe({ version: '4' })) resumeId: string,
  ) {
    return this.resumes.get(request.user.user_id, resumeId);
  }

  @Put(':resumeId')
  @ApiOperation({ summary: 'Replace a resume owned by the current user' })
  update(
    @Req() request: AuthenticatedRequest<AuthPrincipal>,
    @Param('resumeId', new ParseUUIDPipe({ version: '4' })) resumeId: string,
    @Body() dto: ResumeDto,
  ) {
    return this.resumes.update(request.user.user_id, resumeId, dto);
  }

  @Patch(':resumeId/status')
  @ApiOperation({ summary: 'Change publication status of a current user resume' })
  setStatus(
    @Req() request: AuthenticatedRequest<AuthPrincipal>,
    @Param('resumeId', new ParseUUIDPipe({ version: '4' })) resumeId: string,
    @Body() dto: SetResumeStatusDto,
  ) {
    return this.resumes.setStatus(request.user.user_id, resumeId, dto);
  }

  @Delete(':resumeId')
  @ApiOperation({ summary: 'Delete a resume owned by the current user' })
  delete(
    @Req() request: AuthenticatedRequest<AuthPrincipal>,
    @Param('resumeId', new ParseUUIDPipe({ version: '4' })) resumeId: string,
  ) {
    return this.resumes.delete(request.user.user_id, resumeId);
  }
}
