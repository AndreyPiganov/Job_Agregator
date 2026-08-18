import { Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { queryList } from './query-list.transform';

export class ListVacanciesQuery {
  @ApiPropertyOptional({ description: 'Page number', example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  items_per_page?: number;

  @ApiPropertyOptional({ name: 'q', description: 'Search phrase', example: 'Go developer', maxLength: 200 })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    name: 'city',
    description: 'Repeat the parameter or use comma-separated values',
    example: ['Moscow', 'Kazan'],
    isArray: true,
    maxItems: 20,
    type: String,
  })
  @IsOptional()
  @Transform(queryList)
  @IsArray()
  @IsString({ each: true })
  city?: string[];

  @ApiPropertyOptional({
    name: 'search_field',
    description: 'title, description, or company_name',
    enum: ['title', 'description', 'company_name'],
    example: ['title', 'company_name'],
    isArray: true,
    maxItems: 3,
  })
  @IsOptional()
  @Transform(queryList)
  @IsArray()
  @IsString({ each: true })
  search_field?: string[];

  @ApiPropertyOptional({ description: 'Minimum salary', example: 100000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  min_salary?: number;

  @ApiPropertyOptional({ description: 'Maximum salary', example: 300000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  max_salary?: number;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['date_desc', 'date_asc', 'salary_desc', 'salary_asc'],
    example: 'date_desc',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ description: 'Publication period', enum: ['day', '3_days', 'week'], example: 'week' })
  @IsOptional()
  @IsString()
  period?: string;
}
