package mappers

import (
	"strings"

	"vacancy_service/internal/domain"
	vacancyv1 "vacancy_service/internal/proto/vacancy/v1"
	"vacancy_service/internal/service/dto"
)

// ListInputFromProto maps a validated protobuf request into service input.
func ListInputFromProto(request *vacancyv1.ListVacanciesRequest) dto.ListVacanciesInput {
	var input dto.ListVacanciesInput
	if request == nil {
		return input
	}

	if request.Page != nil {
		input.Page = int(request.GetPage())
	}
	if request.ItemsPerPage != nil {
		input.ItemsPerPage = int(request.GetItemsPerPage())
	}
	input.Keyword = strings.TrimSpace(request.GetKeyword())
	input.Cities = citiesFromProto(request.GetCities())
	input.SearchFields = searchFieldsFromProto(request.GetSearchFields())

	if request.MinSalary != nil {
		value := request.GetMinSalary()
		input.MinSalary = &value
	}
	if request.MaxSalary != nil {
		value := request.GetMaxSalary()
		input.MaxSalary = &value
	}

	input.Sort = sortFromProto(request.GetSort())
	input.Period = periodFromProto(request.GetPeriod())
	return input
}

// CreateInputFromProto maps a validated protobuf request into service input.
func CreateInputFromProto(request *vacancyv1.CreateVacancyRequest) dto.CreateVacancyInput {
	return createInputFromProto(request)
}

// BatchCreateInputsFromProto maps a validated protobuf batch into service inputs.
func BatchCreateInputsFromProto(request *vacancyv1.BatchCreateVacanciesRequest) []dto.CreateVacancyInput {
	inputs := make([]dto.CreateVacancyInput, 0, len(request.GetVacancies()))
	for _, vacancy := range request.GetVacancies() {
		inputs = append(inputs, createInputFromProto(vacancy))
	}
	return inputs
}

func createInputFromProto(request *vacancyv1.CreateVacancyRequest) dto.CreateVacancyInput {
	return dto.CreateVacancyInput{
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
