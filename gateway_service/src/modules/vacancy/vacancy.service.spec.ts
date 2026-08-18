import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { of } from 'rxjs';
import {
  Vacancy,
  VacancyPeriod,
  VacancySearchField,
  VacancyServiceClient,
  VacancySort,
} from '../../generated/vacancy/v1/vacancy';
import { VacancyService } from './vacancy.service';

describe('VacancyService', () => {
  let vacancyClient: jest.Mocked<VacancyServiceClient>;
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
      get: jest.fn(() => 3000),
    } as unknown as ConfigService;

    service = new VacancyService(client, config);
    service.onModuleInit();
  });

  it('maps an HTTP id to the protobuf request', async () => {
    vacancyClient.getVacancy.mockReturnValue(of({ vacancy: vacancyFixture({ id: '42', title: 'Go developer' }) }));

    const vacancy = await service.getById('42');

    expect(vacancyClient.getVacancy.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ id: '42' }));
    expect(vacancy.id).toBe('42');
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
        cities: ['Moscow', 'Kazan'],
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
  });

  it('rejects an invalid empty response from the upstream service', async () => {
    vacancyClient.getVacancy.mockReturnValue(of({}));

    await expect(service.getById('42')).rejects.toMatchObject({ kind: 'invalid_response' });
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
