import { loadFileDescriptorSetFromBuffer, ServiceDefinition } from '@grpc/proto-loader';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BatchCreateVacanciesRequest,
  JOBAGGREGATOR_VACANCY_V1_PACKAGE_NAME,
  VacancySearchField,
} from '../../generated/vacancy/v1/vacancy';

describe('Vacancy gRPC runtime contract', () => {
  const packageDefinition = loadFileDescriptorSetFromBuffer(
    readFileSync(join(__dirname, '../../generated/contracts.binpb')),
    {
      arrays: true,
      defaults: true,
      longs: String,
    },
  );
  const service = packageDefinition[`${JOBAGGREGATOR_VACANCY_V1_PACKAGE_NAME}.VacancyService`] as ServiceDefinition;

  it('serializes generated snake_case request fields without dropping values', () => {
    const method = service.BatchCreateVacancies;
    const request: BatchCreateVacanciesRequest = {
      vacancies: [
        {
          title: 'Go developer',
          description: 'Backend vacancy',
          salary: 250000,
          link: 'https://example.com/vacancies/1',
          city: 'Moscow',
          company_name: 'Yandex',
        },
      ],
    };

    const decoded = method.requestDeserialize(method.requestSerialize(request)) as BatchCreateVacanciesRequest;

    expect(decoded.vacancies[0]?.company_name).toBe('Yandex');
  });

  it('keeps snake_case filter fields after protobuf serialization', () => {
    const method = service.ListVacancies;
    const request = {
      items_per_page: 25,
      search_fields: [VacancySearchField.VACANCY_SEARCH_FIELD_COMPANY_NAME],
      min_salary: 100000,
      max_salary: 300000,
    };

    const decoded = method.requestDeserialize(method.requestSerialize(request));

    expect(decoded).toEqual(expect.objectContaining(request));
  });
});
