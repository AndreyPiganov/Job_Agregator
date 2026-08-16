package grpcserver

import (
	"math"
	"testing"

	vacancyv1 "vacancy_service/internal/proto/vacancy/v1"

	"buf.build/go/protovalidate"
	"google.golang.org/protobuf/proto"
)

func TestProtovalidateAcceptsValidRequests(t *testing.T) {
	validator := newProtoValidator(t)
	tests := map[string]proto.Message{
		"get": &vacancyv1.GetVacancyRequest{Id: 42},
		"list": &vacancyv1.ListVacanciesRequest{
			Page:         proto.Int32(2),
			ItemsPerPage: proto.Int32(25),
			Keyword:      proto.String("Go"),
			Cities:       []string{"Moscow", "Kazan"},
			SearchFields: []vacancyv1.VacancySearchField{
				vacancyv1.VacancySearchField_VACANCY_SEARCH_FIELD_TITLE,
				vacancyv1.VacancySearchField_VACANCY_SEARCH_FIELD_COMPANY_NAME,
			},
			MinSalary: proto.Float64(100000),
			MaxSalary: proto.Float64(300000),
			Sort:      vacancyv1.VacancySort_VACANCY_SORT_SALARY_DESC,
			Period:    vacancyv1.VacancyPeriod_VACANCY_PERIOD_THREE_DAYS,
		},
		"create": validCreateRequest(),
		"batch": &vacancyv1.BatchCreateVacanciesRequest{
			Vacancies: []*vacancyv1.CreateVacancyRequest{validCreateRequest()},
		},
	}

	for name, request := range tests {
		t.Run(name, func(t *testing.T) {
			if err := validator.Validate(request); err != nil {
				t.Fatalf("expected valid request, got %v", err)
			}
		})
	}
}

func TestProtovalidateRejectsInvalidRequests(t *testing.T) {
	validator := newProtoValidator(t)
	tests := map[string]proto.Message{
		"zero id": &vacancyv1.GetVacancyRequest{},
		"zero page": &vacancyv1.ListVacanciesRequest{
			Page: proto.Int32(0),
		},
		"items per page above maximum": &vacancyv1.ListVacanciesRequest{
			ItemsPerPage: proto.Int32(101),
		},
		"blank city": &vacancyv1.ListVacanciesRequest{
			Cities: []string{"   "},
		},
		"search field without keyword": &vacancyv1.ListVacanciesRequest{
			SearchFields: []vacancyv1.VacancySearchField{
				vacancyv1.VacancySearchField_VACANCY_SEARCH_FIELD_TITLE,
			},
		},
		"search field with blank keyword": &vacancyv1.ListVacanciesRequest{
			Keyword: proto.String("   "),
			SearchFields: []vacancyv1.VacancySearchField{
				vacancyv1.VacancySearchField_VACANCY_SEARCH_FIELD_TITLE,
			},
		},
		"unspecified search field": &vacancyv1.ListVacanciesRequest{
			Keyword: proto.String("Go"),
			SearchFields: []vacancyv1.VacancySearchField{
				vacancyv1.VacancySearchField_VACANCY_SEARCH_FIELD_UNSPECIFIED,
			},
		},
		"unknown sort": &vacancyv1.ListVacanciesRequest{
			Sort: vacancyv1.VacancySort(99),
		},
		"invalid salary range": &vacancyv1.ListVacanciesRequest{
			MinSalary: proto.Float64(300000),
			MaxSalary: proto.Float64(100000),
		},
		"blank title": createRequestWith(func(request *vacancyv1.CreateVacancyRequest) {
			request.Title = "  "
		}),
		"negative salary": createRequestWith(func(request *vacancyv1.CreateVacancyRequest) {
			request.Salary = -1
		}),
		"non-finite salary": createRequestWith(func(request *vacancyv1.CreateVacancyRequest) {
			request.Salary = math.NaN()
		}),
		"relative link": createRequestWith(func(request *vacancyv1.CreateVacancyRequest) {
			request.Link = "/vacancies/42"
		}),
		"empty batch": &vacancyv1.BatchCreateVacanciesRequest{},
		"invalid batch item": &vacancyv1.BatchCreateVacanciesRequest{
			Vacancies: []*vacancyv1.CreateVacancyRequest{{}},
		},
		"nil batch item": &vacancyv1.BatchCreateVacanciesRequest{
			Vacancies: []*vacancyv1.CreateVacancyRequest{nil},
		},
	}

	for name, request := range tests {
		t.Run(name, func(t *testing.T) {
			if err := validator.Validate(request); err == nil {
				t.Fatal("expected validation error")
			}
		})
	}
}

func newProtoValidator(t *testing.T) protovalidate.Validator {
	t.Helper()
	validator, err := protovalidate.New()
	if err != nil {
		t.Fatalf("create Protovalidate validator: %v", err)
	}
	return validator
}

func createRequestWith(mutate func(*vacancyv1.CreateVacancyRequest)) *vacancyv1.CreateVacancyRequest {
	request := validCreateRequest()
	mutate(request)
	return request
}
