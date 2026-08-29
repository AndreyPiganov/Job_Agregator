import { Controller } from '@nestjs/common';
import { GrpcValidated } from '../../common/proto/grpc-validated.decorator';
import { UserService as UserProtoService } from '../../generated/protovalidate/user/v1/user_pb';
import {
  CreateUserRequest,
  CreateUserResponse,
  UserServiceController,
  UserServiceControllerMethods,
} from '../../generated/user/v1/user';
import { UserService } from './user.service';

@Controller()
@UserServiceControllerMethods()
@GrpcValidated(UserProtoService)
export class UserController implements UserServiceController {
  constructor(private readonly users: UserService) {}

  async createUser(request: CreateUserRequest): Promise<CreateUserResponse> {
    return { created: await this.users.create(request) };
  }
}
