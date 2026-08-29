import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { sha256 } from 'js-sha256';
import { randomUUID } from 'node:crypto';
import { AppCacheService } from '../../common/cache/app-cache.service';
import { AsyncUnaryGrpcClient, createUnaryGrpcClientProxy } from '../../common/grpc/unary-grpc-client.proxy';
import { GrpcErrorMapper } from '../../common/mappers/grpc-error.mapper';
import {
  BatchCreateVacanciesRequest,
  JOBAGGREGATOR_VACANCY_V1_PACKAGE_NAME,
  ListVacanciesResponse,
  Vacancy,
  VACANCY_SERVICE_NAME,
  VacancyServiceClient,
} from '../../generated/vacancy/v1/vacancy';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { ListVacanciesQuery } from './dto/list-vacancies.query';
import { VacancyMapper } from './vacancy.mapper';

@Injectable()
export class VacancyService implements OnModuleInit {
  private vacancyClient!: AsyncUnaryGrpcClient<VacancyServiceClient>;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;

  constructor(
    @Inject(JOBAGGREGATOR_VACANCY_V1_PACKAGE_NAME) private readonly client: ClientGrpc,
    config: ConfigService,
    private readonly cache: AppCacheService,
    private readonly mapper: VacancyMapper,
    private readonly grpcErrors: GrpcErrorMapper,
  ) {
    this.timeoutMs = config.get<number>('grpc.vacancy.timeoutMs', 3000);
    this.cacheTtlMs = config.get<number>('cache.ttlMs', 15000);
  }

  onModuleInit(): void {
    this.vacancyClient = createUnaryGrpcClientProxy(
      this.client.getService<VacancyServiceClient>(VACANCY_SERVICE_NAME),
      {
        service: 'vacancy service',
        timeoutMs: this.timeoutMs,
        errors: this.grpcErrors,
      },
    );
  }

  async getById(id: string): Promise<Vacancy> {
    const cacheKey = vacancyCacheKey(id);
    const cached = await this.cache.get<Vacancy>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await this.vacancyClient.getVacancy({ id });
    const vacancy = response.vacancy;
    await this.cache.set(cacheKey, vacancy, this.cacheTtlMs);
    return vacancy;
  }

  async list(query: ListVacanciesQuery): Promise<ListVacanciesResponse> {
    const request = this.mapper.listToGrpc(query);
    const listVersion = (await this.cache.get<string>(VACANCY_LIST_VERSION_CACHE_KEY)) ?? DEFAULT_CACHE_VERSION;
    const cacheKey = `vacancy:list:${listVersion}:${hashCacheKey(request)}`;
    const cached = await this.cache.get<ListVacanciesResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await this.vacancyClient.listVacancies(request);
    await this.cache.set(cacheKey, response, this.cacheTtlMs);
    return response;
  }

  async create(dto: CreateVacancyDto): Promise<Vacancy> {
    const response = await this.vacancyClient.createVacancy(dto);
    const vacancy = response.vacancy;
    await Promise.all([
      this.cache.set(vacancyCacheKey(vacancy.id), vacancy, this.cacheTtlMs),
      this.invalidateVacancyLists(),
    ]);
    return vacancy;
  }

  async createBatch(vacancies: CreateVacancyDto[]): Promise<Vacancy[]> {
    const response = await this.vacancyClient.batchCreateVacancies({
      vacancies,
    } satisfies BatchCreateVacanciesRequest);

    await Promise.all([
      ...response.vacancies.map((vacancy) => this.cache.set(vacancyCacheKey(vacancy.id), vacancy, this.cacheTtlMs)),
      this.invalidateVacancyLists(),
    ]);
    return response.vacancies;
  }

  private invalidateVacancyLists(): Promise<void> {
    return this.cache.set(VACANCY_LIST_VERSION_CACHE_KEY, randomUUID(), this.cacheTtlMs);
  }
}

const VACANCY_LIST_VERSION_CACHE_KEY = 'vacancy:list:version';
const DEFAULT_CACHE_VERSION = '0';

function vacancyCacheKey(id: string): string {
  return `vacancy:get:${id}`;
}

function hashCacheKey(value: object): string {
  return sha256(JSON.stringify(value));
}
