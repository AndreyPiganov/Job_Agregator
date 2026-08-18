import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable, timeout, TimeoutError } from 'rxjs';
import { grpcErrorToUpstream } from '../../common/errors/grpc-error.mapper';
import { UpstreamServiceError } from '../../common/errors/upstream-service.error';
import {
  BatchCreateVacanciesRequest,
  JOBAGGREGATOR_VACANCY_V1_PACKAGE_NAME,
  ListVacanciesResponse,
  Vacancy,
  VacancyPeriod,
  VacancySearchField,
  VACANCY_SERVICE_NAME,
  VacancyServiceClient,
  VacancySort,
} from '../../generated/vacancy/v1/vacancy';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { ListVacanciesQuery } from './dto/list-vacancies.query';

@Injectable()
export class VacancyService implements OnModuleInit {
  private vacancyClient!: VacancyServiceClient;
  private readonly timeoutMs: number;

  constructor(
    @Inject(JOBAGGREGATOR_VACANCY_V1_PACKAGE_NAME) private readonly client: ClientGrpc,
    config: ConfigService,
  ) {
    this.timeoutMs = config.get<number>('grpc.vacancy.timeoutMs', 3000);
  }

  onModuleInit(): void {
    this.vacancyClient = this.client.getService<VacancyServiceClient>(VACANCY_SERVICE_NAME);
  }

  async getById(id: string): Promise<Vacancy> {
    const response = await this.executeGrpcRequest(this.vacancyClient.getVacancy({ id }));
    return this.requireVacancy(response.vacancy);
  }

  list(query: ListVacanciesQuery): Promise<ListVacanciesResponse> {
    return this.executeGrpcRequest(
      this.vacancyClient.listVacancies({
        page: query.page,
        items_per_page: query.items_per_page,
        keyword: query.q?.trim(),
        cities: query.city ?? [],
        search_fields: (query.search_field ?? []).map(searchFieldFromHttp),
        min_salary: query.min_salary,
        max_salary: query.max_salary,
        sort: sortFromHttp(query.sort),
        period: periodFromHttp(query.period),
      }),
    );
  }

  async create(dto: CreateVacancyDto): Promise<Vacancy> {
    const response = await this.executeGrpcRequest(this.vacancyClient.createVacancy(dto));
    return this.requireVacancy(response.vacancy);
  }

  async createBatch(vacancies: CreateVacancyDto[]): Promise<Vacancy[]> {
    const response = await this.executeGrpcRequest(
      this.vacancyClient.batchCreateVacancies({
        vacancies,
      } satisfies BatchCreateVacanciesRequest),
    );

    return response.vacancies;
  }

  private requireVacancy(vacancy: Vacancy | undefined): Vacancy {
    if (!vacancy) {
      throw new UpstreamServiceError(
        'vacancy service',
        'invalid_response',
        'vacancy service returned an empty response',
      );
    }
    return vacancy;
  }

  private async executeGrpcRequest<Response>(response: Observable<Response>): Promise<Response> {
    try {
      return await firstValueFrom(response.pipe(timeout(this.timeoutMs)));
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new UpstreamServiceError('vacancy service', 'deadline_exceeded', 'vacancy service request timed out', {
          cause: error,
        });
      }

      throw grpcErrorToUpstream(error, 'vacancy service');
    }
  }
}

function searchFieldFromHttp(value: string): VacancySearchField {
  switch (value.trim().toLowerCase()) {
    case 'title':
      return VacancySearchField.VACANCY_SEARCH_FIELD_TITLE;
    case 'description':
      return VacancySearchField.VACANCY_SEARCH_FIELD_DESCRIPTION;
    case 'company_name':
      return VacancySearchField.VACANCY_SEARCH_FIELD_COMPANY_NAME;
    default:
      return VacancySearchField.UNRECOGNIZED;
  }
}

function sortFromHttp(value: string | undefined): VacancySort {
  switch (value?.trim().toLowerCase()) {
    case undefined:
    case '':
      return VacancySort.VACANCY_SORT_UNSPECIFIED;
    case 'date_desc':
      return VacancySort.VACANCY_SORT_DATE_DESC;
    case 'date_asc':
      return VacancySort.VACANCY_SORT_DATE_ASC;
    case 'salary_desc':
      return VacancySort.VACANCY_SORT_SALARY_DESC;
    case 'salary_asc':
      return VacancySort.VACANCY_SORT_SALARY_ASC;
    default:
      return VacancySort.UNRECOGNIZED;
  }
}

function periodFromHttp(value: string | undefined): VacancyPeriod {
  switch (value?.trim().toLowerCase()) {
    case undefined:
    case '':
      return VacancyPeriod.VACANCY_PERIOD_UNSPECIFIED;
    case 'day':
      return VacancyPeriod.VACANCY_PERIOD_DAY;
    case '3_days':
      return VacancyPeriod.VACANCY_PERIOD_THREE_DAYS;
    case 'week':
      return VacancyPeriod.VACANCY_PERIOD_WEEK;
    default:
      return VacancyPeriod.UNRECOGNIZED;
  }
}
