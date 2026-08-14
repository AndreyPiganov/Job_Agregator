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

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
)

type stubVacancyService struct {
	list    func(context.Context, domain.Pagination) ([]domain.Vacancy, error)
	getByID func(context.Context, int64) (domain.Vacancy, error)
}

func (s stubVacancyService) List(ctx context.Context, pagination domain.Pagination) ([]domain.Vacancy, error) {
	if s.list == nil {
		return nil, nil
	}
	return s.list(ctx, pagination)
}

func (s stubVacancyService) GetByID(ctx context.Context, id int64) (domain.Vacancy, error) {
	if s.getByID == nil {
		return domain.Vacancy{}, nil
	}
	return s.getByID(ctx, id)
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

func TestGetVacancyValidatesID(t *testing.T) {
	server := newTestServer(stubVacancyService{})

	_, err := server.GetVacancy(context.Background(), &vacancyv1.GetVacancyRequest{})
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("expected %s, got %s: %v", codes.InvalidArgument, status.Code(err), err)
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
		list: func(_ context.Context, pagination domain.Pagination) ([]domain.Vacancy, error) {
			if pagination.Page != 1 || pagination.ItemsPerPage != 10 {
				t.Fatalf("unexpected pagination: %#v", pagination)
			}
			return []domain.Vacancy{{ID: 1}}, nil
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

func TestListVacanciesRejectsExplicitZeroPage(t *testing.T) {
	server := newTestServer(stubVacancyService{})

	request := &vacancyv1.ListVacanciesRequest{Page: proto.Int32(0)}
	_, err := server.ListVacancies(context.Background(), request)
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("expected %s, got %s: %v", codes.InvalidArgument, status.Code(err), err)
	}
}

func TestListVacanciesHidesInternalError(t *testing.T) {
	server := newTestServer(stubVacancyService{
		list: func(context.Context, domain.Pagination) ([]domain.Vacancy, error) {
			return nil, errors.New("database credentials must not leak")
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
