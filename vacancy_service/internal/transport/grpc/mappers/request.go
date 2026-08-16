package mappers

import (
	"strings"

	"vacancy_service/internal/domain"
	vacancyv1 "vacancy_service/internal/proto/vacancy/v1"
	"vacancy_service/internal/service"
)

type ListParams struct {
	Pagination domain.Pagination
	Filter     domain.VacancyFilter
	HasFilters bool
}

// ListParamsFromProto maps a request already checked by the Protovalidate
// server interceptor into application parameters.
func ListParamsFromProto(request *vacancyv1.ListVacanciesRequest) ListParams {
	pagination := paginationFromProto(request)
	params := ListParams{Pagination: pagination}
	params.Filter.Page = pagination.Page
	params.Filter.ItemsPerPage = pagination.ItemsPerPage
	if request == nil {
		return params
	}

	params.Filter.Keyword = strings.TrimSpace(request.GetKeyword())
	params.Filter.Cities = citiesFromProto(request.GetCities())
	params.Filter.SearchFields = searchFieldsFromProto(request.GetSearchFields())

	if request.MinSalary != nil {
		value := request.GetMinSalary()
		params.Filter.MinSalary = &value
	}
	if request.MaxSalary != nil {
		value := request.GetMaxSalary()
		params.Filter.MaxSalary = &value
	}

	params.Filter.Sort = sortFromProto(request.GetSort())
	params.Filter.Period = periodFromProto(request.GetPeriod())
	params.HasFilters = params.Filter.Keyword != "" ||
		len(params.Filter.Cities) > 0 ||
		len(params.Filter.SearchFields) > 0 ||
		params.Filter.MinSalary != nil ||
		params.Filter.MaxSalary != nil ||
		params.Filter.Sort != "" ||
		params.Filter.Period != ""

	return params
}

// CreateInputFromProto maps a validated protobuf request into a service command.
func CreateInputFromProto(request *vacancyv1.CreateVacancyRequest) service.CreateVacancyInput {
	return createInputFromProto(request)
}

// BatchCreateInputsFromProto maps a validated protobuf batch into service commands.
func BatchCreateInputsFromProto(request *vacancyv1.BatchCreateVacanciesRequest) []service.CreateVacancyInput {
	inputs := make([]service.CreateVacancyInput, 0, len(request.GetVacancies()))
	for _, vacancy := range request.GetVacancies() {
		inputs = append(inputs, createInputFromProto(vacancy))
	}
	return inputs
}

func paginationFromProto(request *vacancyv1.ListVacanciesRequest) domain.Pagination {
	var pagination domain.Pagination
	if request != nil {
		if request.Page != nil {
			pagination.Page = int(request.GetPage())
		}
		if request.ItemsPerPage != nil {
			pagination.ItemsPerPage = int(request.GetItemsPerPage())
		}
	}

	pagination.Normalize()
	return pagination
}

func createInputFromProto(request *vacancyv1.CreateVacancyRequest) service.CreateVacancyInput {
	return service.CreateVacancyInput{
		Title:       strings.TrimSpace(request.GetTitle()),
		Description: strings.TrimSpace(request.GetDescription()),
		Salary:      request.GetSalary(),
		Link:        strings.TrimSpace(request.GetLink()),
		City:        strings.TrimSpace(request.GetCity()),
		CompanyName: strings.TrimSpace(request.GetCompanyName()),
	}
}

func citiesFromProto(values []string) []string {
	result := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func searchFieldsFromProto(values []vacancyv1.VacancySearchField) []domain.VacancySearchField {
	result := make([]domain.VacancySearchField, 0, len(values))
	seen := make(map[domain.VacancySearchField]struct{}, len(values))
	for _, value := range values {
		var field domain.VacancySearchField
		switch value {
		case vacancyv1.VacancySearchField_VACANCY_SEARCH_FIELD_TITLE:
			field = domain.VacancySearchTitle
		case vacancyv1.VacancySearchField_VACANCY_SEARCH_FIELD_DESCRIPTION:
			field = domain.VacancySearchDescription
		case vacancyv1.VacancySearchField_VACANCY_SEARCH_FIELD_COMPANY_NAME:
			field = domain.VacancySearchCompanyName
		default:
			continue
		}
		if _, exists := seen[field]; exists {
			continue
		}
		seen[field] = struct{}{}
		result = append(result, field)
	}
	return result
}

func sortFromProto(value vacancyv1.VacancySort) domain.VacancySort {
	switch value {
	case vacancyv1.VacancySort_VACANCY_SORT_UNSPECIFIED:
		return ""
	case vacancyv1.VacancySort_VACANCY_SORT_DATE_DESC:
		return domain.VacancySortDateDesc
	case vacancyv1.VacancySort_VACANCY_SORT_DATE_ASC:
		return domain.VacancySortDateAsc
	case vacancyv1.VacancySort_VACANCY_SORT_SALARY_DESC:
		return domain.VacancySortSalaryDesc
	case vacancyv1.VacancySort_VACANCY_SORT_SALARY_ASC:
		return domain.VacancySortSalaryAsc
	default:
		return ""
	}
}

func periodFromProto(value vacancyv1.VacancyPeriod) domain.VacancyPeriod {
	switch value {
	case vacancyv1.VacancyPeriod_VACANCY_PERIOD_UNSPECIFIED:
		return ""
	case vacancyv1.VacancyPeriod_VACANCY_PERIOD_DAY:
		return domain.VacancyPeriodDay
	case vacancyv1.VacancyPeriod_VACANCY_PERIOD_THREE_DAYS:
		return domain.VacancyPeriodThreeDays
	case vacancyv1.VacancyPeriod_VACANCY_PERIOD_WEEK:
		return domain.VacancyPeriodWeek
	default:
		return ""
	}
}
