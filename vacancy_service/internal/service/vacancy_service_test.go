package service

import (
	"context"
	"testing"
	"time"

	"vacancy_service/internal/domain"
	"vacancy_service/internal/repository"
	"vacancy_service/internal/service/dto"
)

type stubVacancyRepository struct {
	list   func(context.Context, repository.ListCriteria) ([]domain.Vacancy, error)
	upsert func(context.Context, domain.Vacancy) (domain.Vacancy, error)
}

func (s stubVacancyRepository) GetByID(context.Context, int64) (domain.Vacancy, error) {
	return domain.Vacancy{}, nil
}

func (s stubVacancyRepository) List(ctx context.Context, criteria repository.ListCriteria) ([]domain.Vacancy, error) {
	return s.list(ctx, criteria)
}

func (s stubVacancyRepository) Upsert(ctx context.Context, vacancy domain.Vacancy) (domain.Vacancy, error) {
	return s.upsert(ctx, vacancy)
}

func (s stubVacancyRepository) UpsertBatch(context.Context, []domain.Vacancy) ([]domain.Vacancy, error) {
	return nil, nil
}

func TestListAppliesPaginationAndSearchDefaults(t *testing.T) {
	fixedNow := time.Date(2026, time.August, 12, 12, 0, 0, 0, time.UTC)
	repositoryStub := stubVacancyRepository{
		list: func(_ context.Context, criteria repository.ListCriteria) ([]domain.Vacancy, error) {
			if criteria.Offset != 20 || criteria.Limit != 20 {
				t.Fatalf("expected offset=20 limit=20, got offset=%d limit=%d", criteria.Offset, criteria.Limit)
			}
			if len(criteria.SearchFields) != 3 ||
				criteria.SearchFields[0] != domain.VacancySearchTitle ||
				criteria.SearchFields[1] != domain.VacancySearchDescription ||
				criteria.SearchFields[2] != domain.VacancySearchCompanyName {
				t.Fatalf("expected default search fields, got %#v", criteria.SearchFields)
			}
			if criteria.Sort != domain.VacancySortDateDesc {
				t.Fatalf("expected default date sorting, got %q", criteria.Sort)
			}
			wantCreatedAfter := fixedNow.Add(-3 * 24 * time.Hour)
			if criteria.CreatedAfter == nil || !criteria.CreatedAfter.Equal(wantCreatedAfter) {
				t.Fatalf("expected createdAfter %v, got %v", wantCreatedAfter, criteria.CreatedAfter)
			}
			return []domain.Vacancy{{ID: 42}}, nil
		},
	}
	service := NewVacancyService(repositoryStub)
	service.now = func() time.Time { return fixedNow }

	result, err := service.List(context.Background(), dto.ListVacanciesInput{
		Keyword:      "go",
		Period:       domain.VacancyPeriodThreeDays,
		Page:         2,
		ItemsPerPage: 20,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Page != 2 || result.ItemsPerPage != 20 || len(result.Vacancies) != 1 {
		t.Fatalf("unexpected list result: %#v", result)
	}
}

func TestCreateBuildsDomainVacancy(t *testing.T) {
	repositoryStub := stubVacancyRepository{
		list: func(context.Context, repository.ListCriteria) ([]domain.Vacancy, error) { return nil, nil },
		upsert: func(_ context.Context, vacancy domain.Vacancy) (domain.Vacancy, error) {
			if vacancy.Title != "Go developer" || vacancy.Company == nil || vacancy.Company.Name != "Acme" {
				t.Fatalf("unexpected domain vacancy: %#v", vacancy)
			}
			vacancy.ID = 42
			return vacancy, nil
		},
	}
	service := NewVacancyService(repositoryStub)

	result, err := service.Create(context.Background(), dto.CreateVacancyInput{
		Title:       "Go developer",
		Description: "Build services",
		Salary:      250000,
		CompanyName: "Acme",
		City:        "Moscow",
		Link:        "https://example.com/vacancies/42",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.ID != 42 {
		t.Fatalf("expected created vacancy id 42, got %d", result.ID)
	}
}
