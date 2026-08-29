import { Controller } from '@nestjs/common';
import { GrpcValidated } from '../../common/proto/grpc-validated.decorator';
import { ResumeService as ResumeProtoService } from '../../generated/protovalidate/user/v1/user_pb';
import {
  CreateResumeRequest,
  CreateResumeResponse,
  DeleteResumeRequest,
  DeleteResumeResponse,
  GetResumeRequest,
  GetResumeResponse,
  ListResumesRequest,
  ListResumesResponse,
  ResumeServiceController,
  ResumeServiceControllerMethods,
  SetResumeStatusRequest,
  SetResumeStatusResponse,
  UpdateResumeRequest,
  UpdateResumeResponse,
} from '../../generated/user/v1/user';
import { ResumeService } from './resume.service';

@Controller()
@ResumeServiceControllerMethods()
@GrpcValidated(ResumeProtoService)
export class ResumeController implements ResumeServiceController {
  constructor(private readonly resumeService: ResumeService) {}

  async createResume(request: CreateResumeRequest): Promise<CreateResumeResponse> {
    return { resume: await this.resumeService.create(request) };
  }

  async getResume(request: GetResumeRequest): Promise<GetResumeResponse> {
    return { resume: await this.resumeService.get(request.user_id, request.resume_id) };
  }

  async listResumes(request: ListResumesRequest): Promise<ListResumesResponse> {
    return { resumes: await this.resumeService.list(request.user_id) };
  }

  async updateResume(request: UpdateResumeRequest): Promise<UpdateResumeResponse> {
    return { resume: await this.resumeService.update(request) };
  }

  async setResumeStatus(request: SetResumeStatusRequest): Promise<SetResumeStatusResponse> {
    return { resume: await this.resumeService.setStatus(request) };
  }

  async deleteResume(request: DeleteResumeRequest): Promise<DeleteResumeResponse> {
    return { deleted: await this.resumeService.delete(request.user_id, request.resume_id) };
  }
}
