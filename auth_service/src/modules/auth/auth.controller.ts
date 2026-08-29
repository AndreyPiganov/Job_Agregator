import { Controller } from '@nestjs/common';
import { GrpcValidated } from '../../common/proto/grpc-validated.decorator';
import { AuthService as AuthProtoService } from '../../generated/protovalidate/auth/v1/auth_pb';
import {
  AuthServiceController,
  AuthServiceControllerMethods,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  RegisterResponse,
  ValidateAccessTokenRequest,
  ValidateAccessTokenResponse,
} from '../../generated/auth/v1/auth';
import { AuthMapper } from './mappers/auth.mapper';
import { AuthService } from './services/auth.service';

@Controller()
@AuthServiceControllerMethods()
@GrpcValidated(AuthProtoService)
export class AuthController implements AuthServiceController {
  constructor(
    private readonly authService: AuthService,
    private readonly mapper: AuthMapper,
  ) {}

  async register(request: RegisterRequest): Promise<RegisterResponse> {
    return this.mapper.sessionToGrpc(await this.authService.register(request));
  }

  async login(request: LoginRequest): Promise<LoginResponse> {
    return this.mapper.sessionToGrpc(await this.authService.login(request));
  }

  async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return { tokens: this.mapper.tokenPairToGrpc(await this.authService.refreshToken(request.refresh_token)) };
  }

  async validateAccessToken(request: ValidateAccessTokenRequest): Promise<ValidateAccessTokenResponse> {
    return this.mapper.principalToGrpc(await this.authService.validateAccessToken(request.access_token));
  }

  async logout(request: LogoutRequest): Promise<LogoutResponse> {
    return { revoked: await this.authService.logout(request.refresh_token) };
  }
}
