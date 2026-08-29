import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IsExactlyOneAuthIdentifier } from './auth-identifier.validator';

export class RegisterDto {
  @ApiPropertyOptional({ example: 'user@example.com', maxLength: 320 })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '+79991234567', maxLength: 20 })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9][0-9]{7,14}$/)
  phone_number?: string;

  @ApiProperty({ example: 'strong-password', minLength: 12, maxLength: 72 })
  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: 'Иван', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name!: string;

  @ApiProperty({ example: 'Петров', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name!: string;

  @ApiHideProperty()
  @IsExactlyOneAuthIdentifier()
  readonly identifierSelection?: never;
}
