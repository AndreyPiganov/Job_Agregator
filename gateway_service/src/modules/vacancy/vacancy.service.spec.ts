import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { of } from 'rxjs';
import { AppCacheService } from '../../common/cache/app-cache.service';
import { GrpcErrorMapper } from '../../common/mappers/grpc-error.mapper';
import {
  Vacancy,
  VacancyPeriod,
  VacancySearchField,
  VacancyServiceClient,
  VacancySort,
} from '../../generated/vacancy/v1/vacancy';
import { VacancyMapper } from './vacancy.mapper';
import { VacancyService } from './vacancy.service';

describe('VacancyService', () => {
  let vacancyClient: jest.Mocked<VacancyServiceClient>;
  let cache: jest.Mocked<Pick<AppCacheService, 'get' | 'set'>>;
  let service: VacancyService;

  beforeEach(() => {
    vacancyClient = {
      getVacancy: jest.fn(),
      listVacancies: jest.fn(),
      createVacancy: jest.fn(),
      batchCreateVacancies: jest.fn(),
    };

    const client = {
      getService: jest.fn(() => vacancyClient),
    } as unknown as ClientGrpc;
    const config = {
      get: jest.fn((key: string) => (key === 'cache.ttlMs' ? 15000 : 3000)),
    } as unknown as ConfigService;

    cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };

    service = new VacancyService(
      client,
      config,
      cache as unknown as AppCacheService,
      new VacancyMapper(),
      new GrpcErrorMapper(),
    );
    service.onModuleInit();
  });

  it('maps an HTTP id to the protobuf request', async () => {
    vacancyClient.getVacancy.mockReturnValue(of({ vacancy: vacancyFixture({ id: '42', title: 'Go developer' }) }));

    const vacancy = await service.getById('42');

    expect(vacancyClient.getVacancy.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ id: '42' }));
    expect(vacancy.id).toBe('42');
    expect(cache.set).toHaveBeenCalledWith('vacancy:get:42', vacancy, 15000);
  });

  it('returns a cached vacancy without calling gRPC', async () => {
    cache.get.mockResolvedValue(vacancyFixture({ id: '42', title: 'Cached developer' }));

    const vacancy = await service.getById('42');

    expect(vacancy.title).toBe('Cached developer');
    expect(vacancyClient.getVacancy.mock.calls).toHaveLength(0);
  });

  it('maps HTTP filters to protobuf enums', async () => {
    vacancyClient.listVacancies.mockReturnValue(of({ vacancies: [] }));

    await service.list({
      q: ' Go ',
      city: ['Moscow', 'Kazan'],
      search_field: ['title', 'company_name'],
      sort: 'salary_desc',
      period: '3_days',
      page: 2,
      items_per_page: 25,
    });

    expect(vacancyClient.listVacancies.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        keyword: 'Go',
        cities: ['Kazan', 'Moscow'],
        search_fields: [
          VacancySearchField.VACANCY_SEARCH_FIELD_TITLE,
          VacancySearchField.VACANCY_SEARCH_FIELD_COMPANY_NAME,
        ],
        sort: VacancySort.VACANCY_SORT_SALARY_DESC,
        period: VacancyPeriod.VACANCY_PERIOD_THREE_DAYS,
        page: 2,
        items_per_page: 25,
      }),
    );
  });

  it('passes unsupported enum values to Protovalidate as UNRECOGNIZED', async () => {
    vacancyClient.listVacancies.mockReturnValue(of({ vacancies: [] }));

    await service.list({ sort: 'wrong', period: 'wrong', search_field: ['wrong'] });

    expect(vacancyClient.listVacancies.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        search_fields: [VacancySearchField.UNRECOGNIZED],
        sort: VacancySort.UNRECOGNIZED,
        period: VacancyPeriod.UNRECOGNIZED,
      }),
    );
  });

  it('maps create and batch DTOs to protobuf requests', async () => {
    vacancyClient.createVacancy.mockReturnValue(of({ vacancy: vacancyFixture({ id: '1', title: 'Go developer' }) }));
    vacancyClient.batchCreateVacancies.mockReturnValue(
      of({ vacancies: [vacancyFixture({ id: '2', title: 'Backend developer' })] }),
    );

    await service.create({
      title: 'Go developer',
      description: 'Backend vacancy',
      salary: 250000,
      link: 'https://example.com/vacancies/1',
      city: 'Moscow',
      company_name: 'Yandex',
    });
    await service.createBatch([
      {
        title: 'Backend developer',
        description: 'Backend vacancy',
        salary: 200000,
        link: 'https://example.com/vacancies/2',
        city: 'Moscow',
        company_name: 'T-Bank',
      },
    ]);

    expect(vacancyClient.createVacancy.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ title: 'Go developer', salary: 250000, company_name: 'Yandex' }),
    );
    expect(vacancyClient.batchCreateVacancies.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        vacancies: [expect.objectContaining({ title: 'Backend developer', salary: 200000, company_name: 'T-Bank' })],
      }),
    );
    expect(cache.set).toHaveBeenCalledWith('vacancy:get:1', expect.objectContaining({ id: '1' }), 15000);
    expect(cache.set).toHaveBeenCalledWith('vacancy:get:2', expect.objectContaining({ id: '2' }), 15000);
    expect(cache.set.mock.calls.filter(([key]) => key === 'vacancy:list:version')).toHaveLength(2);
  });
});

function vacancyFixture(overrides: Partial<Vacancy> = {}): Vacancy {
  return {
    id: '1',
    title: 'Developer',
    description: '',
    company_id: '1',
    salary: 0,
    link: '',
    city: '',
    ...overrides,
  };
}
