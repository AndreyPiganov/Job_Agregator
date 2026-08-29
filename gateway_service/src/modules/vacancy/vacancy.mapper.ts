import { Injectable } from '@nestjs/common';
import {
  ListVacanciesRequest,
  VacancyPeriod,
  VacancySearchField,
  VacancySort,
} from '../../generated/vacancy/v1/vacancy';
import { ListVacanciesQuery } from './dto/list-vacancies.query';

@Injectable()
export class VacancyMapper {
  listToGrpc(query: ListVacanciesQuery): ListVacanciesRequest {
    return {
      page: query.page,
      items_per_page: query.items_per_page,
      keyword: query.q?.trim(),
      cities: [...(query.city ?? [])].sort(),
      search_fields: (query.search_field ?? []).map((value) => this.searchFieldToGrpc(value)).sort(),
      min_salary: query.min_salary,
      max_salary: query.max_salary,
      sort: this.sortToGrpc(query.sort),
      period: this.periodToGrpc(query.period),
    };
  }

  private searchFieldToGrpc(value: string): VacancySearchField {
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

  private sortToGrpc(value: string | undefined): VacancySort {
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

  private periodToGrpc(value: string | undefined): VacancyPeriod {
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
}
