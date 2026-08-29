import { Controller } from '@nestjs/common';
import { GrpcValidated } from '../../common/proto/grpc-validated.decorator';
import { UserProfileService } from '../../generated/protovalidate/user/v1/user_pb';
import {
  CreateEducationRequest,
  CreateEducationResponse,
  CreateWorkExperienceRequest,
  CreateWorkExperienceResponse,
  DeleteEducationRequest,
  DeleteEducationResponse,
  DeleteWorkExperienceRequest,
  DeleteWorkExperienceResponse,
  GetUserProfileRequest,
  GetUserProfileResponse,
  UpdateEducationRequest,
  UpdateEducationResponse,
  UpdateWorkExperienceRequest,
  UpdateWorkExperienceResponse,
  UpsertUserProfileRequest,
  UpsertUserProfileResponse,
  UserProfileServiceController,
  UserProfileServiceControllerMethods,
} from '../../generated/user/v1/user';
import { ProfileService } from './profile.service';

@Controller()
@UserProfileServiceControllerMethods()
@GrpcValidated(UserProfileService)
export class ProfileController implements UserProfileServiceController {
  constructor(private readonly profileService: ProfileService) {}

  async getUserProfile(request: GetUserProfileRequest): Promise<GetUserProfileResponse> {
    return { profile: await this.profileService.get(request.user_id) };
  }

  async upsertUserProfile(request: UpsertUserProfileRequest): Promise<UpsertUserProfileResponse> {
    return { profile: await this.profileService.upsert(request) };
  }

  async createEducation(request: CreateEducationRequest): Promise<CreateEducationResponse> {
    return { education: await this.profileService.createEducation(request) };
  }

  async updateEducation(request: UpdateEducationRequest): Promise<UpdateEducationResponse> {
    return { education: await this.profileService.updateEducation(request) };
  }

  async deleteEducation(request: DeleteEducationRequest): Promise<DeleteEducationResponse> {
    return { deleted: await this.profileService.deleteEducation(request.user_id, request.education_id) };
  }

  async createWorkExperience(request: CreateWorkExperienceRequest): Promise<CreateWorkExperienceResponse> {
    return { work_experience: await this.profileService.createWorkExperience(request) };
  }

  async updateWorkExperience(request: UpdateWorkExperienceRequest): Promise<UpdateWorkExperienceResponse> {
    return { work_experience: await this.profileService.updateWorkExperience(request) };
  }

  async deleteWorkExperience(request: DeleteWorkExperienceRequest): Promise<DeleteWorkExperienceResponse> {
    return {
      deleted: await this.profileService.deleteWorkExperience(request.user_id, request.work_experience_id),
    };
  }
}
