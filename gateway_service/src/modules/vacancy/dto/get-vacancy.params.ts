import { Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetVacancyParams {
  @ApiProperty({ description: 'Positive 64-bit vacancy identifier', example: '42', pattern: '^[1-9]\\d*$' })
  @Matches(/^[1-9]\d*$/, { message: 'id must be a positive integer' })
  id!: string;
}
