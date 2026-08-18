import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVacancyDto {
  @ApiProperty({
    description: 'Vacancy title',
    example: 'Senior Go Developer',
    minLength: 1,
    maxLength: 200,
    pattern: '.*\\S.*',
  })
  @IsString()
  title!: string;

  @ApiProperty({
    description: 'Full vacancy description',
    example: 'Develop and maintain backend services in Go.',
    minLength: 1,
    maxLength: 10000,
    pattern: '.*\\S.*',
  })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Salary amount', example: 250000, minimum: 0 })
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  salary!: number;

  @ApiProperty({
    description: 'Link to the original vacancy',
    example: 'https://example.com/vacancies/123',
    format: 'uri',
    maxLength: 2048,
  })
  @IsString()
  link!: string;

  @ApiProperty({
    description: 'Vacancy city',
    example: 'Moscow',
    minLength: 1,
    maxLength: 100,
    pattern: '.*\\S.*',
  })
  @IsString()
  city!: string;

  @ApiProperty({
    description: 'Company name',
    example: 'Yandex',
    minLength: 1,
    maxLength: 200,
    pattern: '.*\\S.*',
  })
  @IsString()
  company_name!: string;
}
