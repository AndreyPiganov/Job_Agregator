import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GatewayAuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthPrincipal, AuthSession, AuthenticatedRequest } from './interfaces/auth.interfaces';

@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: GatewayAuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register with email or phone number, password and required name' })
  @ApiCreatedResponse({ description: 'Account and JWT pair created' })
  @ApiConflictResponse({ description: 'Email or phone number is already registered' })
  register(@Body() dto: RegisterDto): Promise<AuthSession> {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email or phone number' })
  @ApiOkResponse({ description: 'Account and JWT pair' })
  @ApiUnauthorizedResponse({ description: 'Invalid identifier or password' })
  login(@Body() dto: LoginDto): Promise<AuthSession> {
    return this.auth.login(dto.identifier, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue a new JWT pair' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refreshToken(dto.refresh_token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a refresh session' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto.refresh_token).then((revoked) => ({ revoked }));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Locally validate the Bearer access token and return its principal' })
  @ApiOkResponse({ description: 'Current authenticated principal' })
  @ApiUnauthorizedResponse({ description: 'Missing, malformed or expired access token' })
  me(@Req() request: AuthenticatedRequest<AuthPrincipal>): AuthPrincipal {
    return request.user;
  }
}
