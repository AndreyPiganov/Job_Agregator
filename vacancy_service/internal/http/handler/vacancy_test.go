package vacancy

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"vacancy_service/internal/domain"
	service "vacancy_service/internal/service"
)

type stubVacancyStore struct {
	getByID func(context.Context, int64) (domain.Vacancy, error)
}

func (s stubVacancyStore) List(context.Context, int, int) ([]domain.Vacancy, error) {
	return nil, nil
}

func (s stubVacancyStore) GetByID(ctx context.Context, id int64) (domain.Vacancy, error) {
	return s.getByID(ctx, id)
}

func (s stubVacancyStore) Create(context.Context, service.CreateVacancyInput) (domain.Vacancy, error) {
	return domain.Vacancy{}, nil
}

func (s stubVacancyStore) CreateBatch(context.Context, []service.CreateVacancyInput) ([]domain.Vacancy, error) {
	return nil, nil
}

func (s stubVacancyStore) ListByCompany(context.Context, string) ([]domain.Vacancy, error) {
	return nil, nil
}

func (s stubVacancyStore) ListBySalaryRange(context.Context, float64, float64) ([]domain.Vacancy, error) {
	return nil, nil
}

func newTestHandler(store stubVacancyStore) *handler {
	return NewHandler(
		service.NewService(store),
		slog.New(slog.NewTextHandler(io.Discard, nil)),
	)
}

func TestGetByIDReturnsNotFound(t *testing.T) {
	handler := newTestHandler(stubVacancyStore{
		getByID: func(context.Context, int64) (domain.Vacancy, error) {
			return domain.Vacancy{}, domain.ErrVacancyNotFound
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/vacancies/42", nil)
	response := httptest.NewRecorder()
	handler.GetByID(response, req)

	if response.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d", http.StatusNotFound, response.Code)
	}
}

func TestCreateRejectsInvalidRequest(t *testing.T) {
	handler := newTestHandler(stubVacancyStore{})
	req := httptest.NewRequest(http.MethodPost, "/vacancies", strings.NewReader(`{"title":"   "}`))
	response := httptest.NewRecorder()
	handler.Create(response, req)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, response.Code)
	}
	if !strings.Contains(response.Body.String(), "title is required") {
		t.Fatalf("expected a safe validation error, got %s", response.Body.String())
	}
}

func TestListRejectsInvalidPagination(t *testing.T) {
	handler := newTestHandler(stubVacancyStore{})
	req := httptest.NewRequest(http.MethodGet, "/vacancies?page=abc", nil)
	response := httptest.NewRecorder()
	handler.List(response, req)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, response.Code)
	}
}
