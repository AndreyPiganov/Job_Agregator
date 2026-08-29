import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsEmailOrPhone } from './auth-identifier.validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email or phone number in E.164 format', maxLength: 320 })
  @IsEmailOrPhone()
  @MaxLength(320)
  identifier!: string;

  @ApiProperty({ example: 'strong-password', minLength: 1, maxLength: 72 })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}
