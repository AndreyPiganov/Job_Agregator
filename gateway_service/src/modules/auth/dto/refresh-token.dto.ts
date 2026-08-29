import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh JWT returned by register, login or refresh' })
  @IsString()
  @IsNotEmpty()
  refresh_token!: string;
}
