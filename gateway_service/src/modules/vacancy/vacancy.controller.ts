import { Body, Controller, Get, Param, ParseArrayPipe, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ListVacanciesResponse, Vacancy } from '../../generated/vacancy/v1/vacancy';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { GetVacancyParams } from './dto/get-vacancy.params';
import { ListVacanciesQuery } from './dto/list-vacancies.query';
import { VacancyService } from './vacancy.service';

@ApiTags('vacancies')
@ApiExtraModels(CreateVacancyDto)
@Controller('api/v1/vacancies')
export class VacancyController {
  constructor(private readonly vacancyService: VacancyService) {}

  @Get()
  @ApiOperation({ summary: 'List and filter vacancies' })
  @ApiOkResponse({ description: 'Vacancies with normalized pagination' })
  list(@Query() query: ListVacanciesQuery): Promise<ListVacanciesResponse> {
    return this.vacancyService.list(query);
  }

  @Get('filter')
  @ApiOperation({ summary: 'Filter vacancies (backward-compatible route)' })
  @ApiOkResponse({ description: 'Filtered vacancies with normalized pagination' })
  filter(@Query() query: ListVacanciesQuery): Promise<ListVacanciesResponse> {
    return this.vacancyService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vacancy by ID' })
  @ApiOkResponse({ description: 'Vacancy found' })
  getById(@Param() params: GetVacancyParams): Promise<Vacancy> {
    return this.vacancyService.getById(params.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a vacancy' })
  @ApiCreatedResponse({ description: 'Vacancy created' })
  create(@Body() dto: CreateVacancyDto): Promise<Vacancy> {
    return this.vacancyService.create(dto);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Create multiple vacancies' })
  @ApiBody({
    description: 'Vacancies to create. The request body is a JSON array, not an object with a vacancies property.',
    schema: {
      type: 'array',
      minItems: 1,
      maxItems: 1000,
      items: { $ref: getSchemaPath(CreateVacancyDto) },
    },
  })
  @ApiCreatedResponse({ description: 'Vacancies created' })
  createBatch(
    @Body(
      new ParseArrayPipe({
        forbidNonWhitelisted: true,
        items: CreateVacancyDto,
        whitelist: true,
      }),
    )
    vacancies: CreateVacancyDto[],
  ): Promise<Vacancy[]> {
    return this.vacancyService.createBatch(vacancies);
  }
}
