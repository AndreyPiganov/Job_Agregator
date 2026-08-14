package handler

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	domain "vacancy_service/internal/domain"
	service "vacancy_service/internal/service"
	"vacancy_service/internal/transport/http/validation"

	"github.com/go-chi/chi/v5"
)

type stubService struct {
	getByID     func(context.Context, int64) (domain.Vacancy, error)
	createBatch func(context.Context, []service.CreateVacancyInput) ([]domain.Vacancy, error)
	filter      func(context.Context, domain.VacancyFilter) ([]domain.Vacancy, error)
}

func (s stubService) List(context.Context, domain.Pagination) ([]domain.Vacancy, error) {
	return []domain.Vacancy{}, nil
}

func (s stubService) GetByID(ctx context.Context, id int64) (domain.Vacancy, error) {
	if s.getByID == nil {
		return domain.Vacancy{}, nil
	}
	return s.getByID(ctx, id)
}

func (s stubService) Create(context.Context, service.CreateVacancyInput) (domain.Vacancy, error) {
	return domain.Vacancy{}, nil
}

func (s stubService) CreateBatch(ctx context.Context, inputs []service.CreateVacancyInput) ([]domain.Vacancy, error) {
	if s.createBatch == nil {
		return []domain.Vacancy{}, nil
	}
	return s.createBatch(ctx, inputs)
}

func (s stubService) ListByFilterParams(ctx context.Context, filter domain.VacancyFilter) ([]domain.Vacancy, error) {
	if s.filter == nil {
		return []domain.Vacancy{}, nil
	}
	return s.filter(ctx, filter)
}

func newTestHandler(t *testing.T, service Service) *handler {
	t.Helper()
	requestValidator, err := validation.New()
	if err != nil {
		t.Fatalf("create validator: %v", err)
	}
	return NewHandler(service, slog.New(slog.NewTextHandler(io.Discard, nil)), requestValidator)
}

func TestGetByIDReturnsNotFound(t *testing.T) {
	h := newTestHandler(t, stubService{
		getByID: func(context.Context, int64) (domain.Vacancy, error) {
			return domain.Vacancy{}, domain.ErrVacancyNotFound
		},
	})
	req := httptest.NewRequest(http.MethodGet, "/vacancies/42", nil)
	routeContext := chi.NewRouteContext()
	routeContext.URLParams.Add("id", "42")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, routeContext))
	response := httptest.NewRecorder()

	h.GetByID(response, req)

	if response.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d", http.StatusNotFound, response.Code)
	}
}

func TestCreateRejectsInvalidRequest(t *testing.T) {
	h := newTestHandler(t, stubService{})
	req := httptest.NewRequest(http.MethodPost, "/vacancies", strings.NewReader(`{"title":"   "}`))
	response := httptest.NewRecorder()

	h.Create(response, req)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, response.Code)
	}
	if !strings.Contains(response.Body.String(), "title is required") {
		t.Fatalf("expected validation error, got %s", response.Body.String())
	}
}

func TestCreateBatchAcceptsWrappedPayload(t *testing.T) {
	called := false
	h := newTestHandler(t, stubService{
		createBatch: func(_ context.Context, inputs []service.CreateVacancyInput) ([]domain.Vacancy, error) {
			called = true
			if len(inputs) != 1 || inputs[0].CompanyName != "Acme" {
				t.Fatalf("unexpected inputs: %#v", inputs)
			}
			return []domain.Vacancy{}, nil
		},
	})
	body := `{"vacancies":[{"title":"Go developer","description":"Services","salary":100,"city":"Moscow","link":"https://example.com/1","companyName":"Acme"}]}`
	req := httptest.NewRequest(http.MethodPost, "/vacancies/batch", strings.NewReader(body))
	response := httptest.NewRecorder()

	h.CreateBatch(response, req)

	if response.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d: %s", http.StatusCreated, response.Code, response.Body.String())
	}
	if !called {
		t.Fatal("expected service CreateBatch to be called")
	}
}

func TestListRejectsInvalidPagination(t *testing.T) {
	h := newTestHandler(t, stubService{})
	req := httptest.NewRequest(http.MethodGet, "/vacancies?page=abc", nil)
	response := httptest.NewRecorder()

	h.List(response, req)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, response.Code)
	}
}

func TestListByFilterParsesCitiesAndSearchFields(t *testing.T) {
	called := false
	h := newTestHandler(t, stubService{
		filter: func(_ context.Context, filter domain.VacancyFilter) ([]domain.Vacancy, error) {
			called = true
			if len(filter.Cities) != 3 || filter.Cities[0] != "Moscow" || filter.Cities[2] != "Kazan" {
				t.Fatalf("unexpected cities: %#v", filter.Cities)
			}
			if len(filter.SearchFields) != 2 || filter.SearchFields[0] != domain.VacancySearchTitle || filter.SearchFields[1] != domain.VacancySearchCompanyName {
				t.Fatalf("unexpected search fields: %#v", filter.SearchFields)
			}
			if filter.MinSalary == nil || *filter.MinSalary != 100.5 || filter.MaxSalary == nil || *filter.MaxSalary != 200 {
				t.Fatalf("unexpected salary range: %#v - %#v", filter.MinSalary, filter.MaxSalary)
			}
			if filter.Page != 2 || filter.ItemsPerPage != 25 {
				t.Fatalf("unexpected pagination: page=%d limit=%d", filter.Page, filter.ItemsPerPage)
			}
			if filter.Sort != domain.VacancySortSalaryDesc || filter.Period != domain.VacancyPeriodThreeDays {
				t.Fatalf("unexpected sort or period: sort=%q period=%q", filter.Sort, filter.Period)
			}
			return []domain.Vacancy{}, nil
		},
	})
	req := httptest.NewRequest(
		http.MethodGet,
		"/vacancies/filter?q=go&city=Moscow&city=Saint%20Petersburg,Kazan&search_field=title&search_field=company_name&minSalary=100.5&maxSalary=200&sort=salary_desc&period=3_days&page=2&itemsPerPage=25",
		nil,
	)
	response := httptest.NewRecorder()

	h.ListByFilterParams(response, req)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, response.Code, response.Body.String())
	}
	if !called {
		t.Fatal("expected service filter method to be called")
	}
}

func TestListByFilterRejectsInvalidSalaryRange(t *testing.T) {
	h := newTestHandler(t, stubService{})
	req := httptest.NewRequest(http.MethodGet, "/vacancies/filter?minSalary=200&maxSalary=100", nil)
	response := httptest.NewRecorder()

	h.ListByFilterParams(response, req)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, response.Code)
	}
}

func TestListByFilterRejectsCityAsSearchField(t *testing.T) {
	h := newTestHandler(t, stubService{})
	req := httptest.NewRequest(http.MethodGet, "/vacancies/filter?q=Moscow&search_field=city", nil)
	response := httptest.NewRecorder()

	h.ListByFilterParams(response, req)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, response.Code)
	}
}

func TestListByFilterRejectsInvalidSortAndPeriod(t *testing.T) {
	tests := []string{
		"/vacancies/filter?sort=unknown",
		"/vacancies/filter?period=month",
	}

	for _, target := range tests {
		t.Run(target, func(t *testing.T) {
			h := newTestHandler(t, stubService{})
			req := httptest.NewRequest(http.MethodGet, target, nil)
			response := httptest.NewRecorder()

			h.ListByFilterParams(response, req)

			if response.Code != http.StatusBadRequest {
				t.Fatalf("expected status %d, got %d: %s", http.StatusBadRequest, response.Code, response.Body.String())
			}
		})
	}
}
