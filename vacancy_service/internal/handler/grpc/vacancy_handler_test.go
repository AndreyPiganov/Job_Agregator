package grpcserver

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"vacancy_service/internal/domain"
	vacancyv1 "vacancy_service/internal/proto/vacancy/v1"
	"vacancy_service/internal/service/dto"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
)

type stubVacancyService struct {
	list        func(context.Context, dto.ListVacanciesInput) (dto.ListVacanciesResult, error)
	getByID     func(context.Context, int64) (domain.Vacancy, error)
	create      func(context.Context, dto.CreateVacancyInput) (domain.Vacancy, error)
	createBatch func(context.Context, []dto.CreateVacancyInput) ([]domain.Vacancy, error)
}

func (s stubVacancyService) List(ctx context.Context, input dto.ListVacanciesInput) (dto.ListVacanciesResult, error) {
	if s.list == nil {
		return dto.ListVacanciesResult{}, nil
	}
	return s.list(ctx, input)
}

func (s stubVacancyService) GetByID(ctx context.Context, id int64) (domain.Vacancy, error) {
	if s.getByID == nil {
		return domain.Vacancy{}, nil
	}
	return s.getByID(ctx, id)
}

func (s stubVacancyService) Create(ctx context.Context, input dto.CreateVacancyInput) (domain.Vacancy, error) {
	if s.create == nil {
		return domain.Vacancy{}, nil
	}
	return s.create(ctx, input)
}

func (s stubVacancyService) CreateBatch(ctx context.Context, inputs []dto.CreateVacancyInput) ([]domain.Vacancy, error) {
	if s.createBatch == nil {
		return nil, nil
	}
	return s.createBatch(ctx, inputs)
}

func newTestServer(service VacancyService) *Server {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return NewServer(service, logger)
}

func TestGetVacancyMapsDomainEntity(t *testing.T) {
	createdAt := time.Date(2026, time.August, 14, 12, 0, 0, 0, time.UTC)
	server := newTestServer(stubVacancyService{
		getByID: func(_ context.Context, id int64) (domain.Vacancy, error) {
			if id != 42 {
				t.Fatalf("expected id 42, got %d", id)
			}
			return domain.Vacancy{
				ID:          id,
				Title:       "Go developer",
				Description: "Build services",
				CompanyID:   7,
				Salary:      250000,
				Link:        "https://example.com/vacancies/42",
				City:        "Moscow",
				CreatedAt:   createdAt,
				UpdatedAt:   createdAt,
				Company:     &domain.Company{ID: 7, Name: "Acme"},
			}, nil
		},
	})

	response, err := server.GetVacancy(context.Background(), &vacancyv1.GetVacancyRequest{Id: 42})
	if err != nil {
		t.Fatalf("GetVacancy returned error: %v", err)
	}
	if response.GetVacancy().GetCompany().GetName() != "Acme" {
		t.Fatalf("unexpected vacancy: %v", response.GetVacancy())
	}
	if !response.GetVacancy().GetCreatedAt().AsTime().Equal(createdAt) {
		t.Fatalf("unexpected created_at: %v", response.GetVacancy().GetCreatedAt())
	}
}

func TestGetVacancyMapsNotFound(t *testing.T) {
	server := newTestServer(stubVacancyService{
		getByID: func(context.Context, int64) (domain.Vacancy, error) {
			return domain.Vacancy{}, domain.ErrVacancyNotFound
		},
	})

	_, err := server.GetVacancy(context.Background(), &vacancyv1.GetVacancyRequest{Id: 42})
	if status.Code(err) != codes.NotFound {
		t.Fatalf("expected %s, got %s: %v", codes.NotFound, status.Code(err), err)
	}
}

func TestListVacanciesAppliesPaginationDefaults(t *testing.T) {
	server := newTestServer(stubVacancyService{
		list: func(_ context.Context, input dto.ListVacanciesInput) (dto.ListVacanciesResult, error) {
			if input.Page != 0 || input.ItemsPerPage != 0 {
				t.Fatalf("transport must preserve omitted pagination: %#v", input)
			}
			return dto.ListVacanciesResult{Vacancies: []domain.Vacancy{{ID: 1}}, Page: 1, ItemsPerPage: 10}, nil
		},
	})

	response, err := server.ListVacancies(context.Background(), &vacancyv1.ListVacanciesRequest{})
	if err != nil {
		t.Fatalf("ListVacancies returned error: %v", err)
	}
	if response.GetPageInfo().GetPage() != 1 || response.GetPageInfo().GetItemsPerPage() != 10 {
		t.Fatalf("unexpected page info: %v", response.GetPageInfo())
	}
	if len(response.GetVacancies()) != 1 {
		t.Fatalf("expected one vacancy, got %d", len(response.GetVacancies()))
	}
}

func TestListVacanciesMapsFilters(t *testing.T) {
	server := newTestServer(stubVacancyService{
		list: func(_ context.Context, input dto.ListVacanciesInput) (dto.ListVacanciesResult, error) {
			if input.Page != 2 || input.ItemsPerPage != 25 {
				t.Fatalf("unexpected pagination: %#v", input)
			}
			if input.Keyword != "Go" {
				t.Fatalf("unexpected keyword: %q", input.Keyword)
			}
			if len(input.Cities) != 2 || input.Cities[0] != "Moscow" || input.Cities[1] != "Kazan" {
				t.Fatalf("unexpected cities: %#v", input.Cities)
			}
			if len(input.SearchFields) != 2 || input.SearchFields[0] != domain.VacancySearchTitle || input.SearchFields[1] != domain.VacancySearchCompanyName {
				t.Fatalf("unexpected search fields: %#v", input.SearchFields)
			}
			if input.MinSalary == nil || *input.MinSalary != 100000 || input.MaxSalary == nil || *input.MaxSalary != 300000 {
				t.Fatalf("unexpected salary filter: %#v", input)
			}
			if input.Sort != domain.VacancySortSalaryDesc || input.Period != domain.VacancyPeriodThreeDays {
				t.Fatalf("unexpected sort or period: %#v", input)
			}
			return dto.ListVacanciesResult{Vacancies: []domain.Vacancy{{ID: 7}}, Page: 2, ItemsPerPage: 25}, nil
		},
	})

	response, err := server.ListVacancies(context.Background(), &vacancyv1.ListVacanciesRequest{
		Page:         proto.Int32(2),
		ItemsPerPage: proto.Int32(25),
		Keyword:      proto.String(" Go "),
		Cities:       []string{" Moscow ", "Kazan", "Moscow"},
		SearchFields: []vacancyv1.VacancySearchField{
			vacancyv1.VacancySearchField_VACANCY_SEARCH_FIELD_TITLE,
			vacancyv1.VacancySearchField_VACANCY_SEARCH_FIELD_COMPANY_NAME,
		},
		MinSalary: proto.Float64(100000),
		MaxSalary: proto.Float64(300000),
		Sort:      vacancyv1.VacancySort_VACANCY_SORT_SALARY_DESC,
		Period:    vacancyv1.VacancyPeriod_VACANCY_PERIOD_THREE_DAYS,
	})
	if err != nil {
		t.Fatalf("ListVacancies returned error: %v", err)
	}
	if len(response.GetVacancies()) != 1 || response.GetVacancies()[0].GetId() != 7 {
		t.Fatalf("unexpected vacancies: %v", response.GetVacancies())
	}
	if response.GetPageInfo().GetPage() != 2 || response.GetPageInfo().GetItemsPerPage() != 25 {
		t.Fatalf("unexpected page info: %v", response.GetPageInfo())
	}
}

func TestCreateVacancyMapsRequest(t *testing.T) {
	server := newTestServer(stubVacancyService{
		create: func(_ context.Context, input dto.CreateVacancyInput) (domain.Vacancy, error) {
			if input.Title != "Go developer" || input.Description != "Build services" {
				t.Fatalf("unexpected text fields: %#v", input)
			}
			if input.CompanyName != "Acme" || input.City != "Moscow" || input.Salary != 250000 {
				t.Fatalf("unexpected create input: %#v", input)
			}
			return domain.Vacancy{ID: 42, Title: input.Title}, nil
		},
	})

	response, err := server.CreateVacancy(context.Background(), validCreateRequest())
	if err != nil {
		t.Fatalf("CreateVacancy returned error: %v", err)
	}
	if response.GetVacancy().GetId() != 42 || response.GetVacancy().GetTitle() != "Go developer" {
		t.Fatalf("unexpected response: %v", response)
	}
}

func TestBatchCreateVacancies(t *testing.T) {
	server := newTestServer(stubVacancyService{
		createBatch: func(_ context.Context, inputs []dto.CreateVacancyInput) ([]domain.Vacancy, error) {
			if len(inputs) != 2 || inputs[1].CompanyName != "Acme" {
				t.Fatalf("unexpected batch inputs: %#v", inputs)
			}
			return []domain.Vacancy{{ID: 1}, {ID: 2}}, nil
		},
	})

	response, err := server.BatchCreateVacancies(context.Background(), &vacancyv1.BatchCreateVacanciesRequest{
		Vacancies: []*vacancyv1.CreateVacancyRequest{validCreateRequest(), validCreateRequest()},
	})
	if err != nil {
		t.Fatalf("BatchCreateVacancies returned error: %v", err)
	}
	if len(response.GetVacancies()) != 2 {
		t.Fatalf("expected two vacancies, got %d", len(response.GetVacancies()))
	}
}

func TestListVacanciesHidesInternalError(t *testing.T) {
	server := newTestServer(stubVacancyService{
		list: func(context.Context, dto.ListVacanciesInput) (dto.ListVacanciesResult, error) {
			return dto.ListVacanciesResult{}, errors.New("database credentials must not leak")
		},
	})

	_, err := server.ListVacancies(context.Background(), nil)
	if status.Code(err) != codes.Internal {
		t.Fatalf("expected %s, got %s: %v", codes.Internal, status.Code(err), err)
	}
	if status.Convert(err).Message() != "internal server error" {
		t.Fatalf("unexpected public error: %v", err)
	}
}

func validCreateRequest() *vacancyv1.CreateVacancyRequest {
	return &vacancyv1.CreateVacancyRequest{
		Title:       " Go developer ",
		Description: " Build services ",
		Salary:      250000,
		Link:        "https://example.com/vacancies/42",
		City:        " Moscow ",
		CompanyName: " Acme ",
	}
}
