package service

import (
	"context"
	"testing"
	"time"

	domain "vacancy_service/internal/domain"
)

type stubRepository struct {
	filter func(context.Context, domain.VacancyFilter, int, int) ([]domain.Vacancy, error)
}

func (s stubRepository) List(context.Context, int, int) ([]domain.Vacancy, error) {
	return nil, nil
}

func (s stubRepository) GetByID(context.Context, int64) (domain.Vacancy, error) {
	return domain.Vacancy{}, nil
}

func (s stubRepository) Create(context.Context, CreateVacancyInput) (domain.Vacancy, error) {
	return domain.Vacancy{}, nil
}

func (s stubRepository) CreateBatch(context.Context, []CreateVacancyInput) ([]domain.Vacancy, error) {
	return nil, nil
}

func (s stubRepository) ListByFilterParams(ctx context.Context, filter domain.VacancyFilter, offset, limit int) ([]domain.Vacancy, error) {
	return s.filter(ctx, filter, offset, limit)
}

func TestListByFilterParamsAppliesPaginationAndDefaultSearchFields(t *testing.T) {
	fixedNow := time.Date(2026, time.August, 12, 12, 0, 0, 0, time.UTC)
	repo := stubRepository{
		filter: func(_ context.Context, filter domain.VacancyFilter, offset, limit int) ([]domain.Vacancy, error) {
			if offset != 20 || limit != 20 {
				t.Fatalf("expected offset=20 limit=20, got offset=%d limit=%d", offset, limit)
			}
			if len(filter.SearchFields) != 3 ||
				filter.SearchFields[0] != domain.VacancySearchTitle ||
				filter.SearchFields[1] != domain.VacancySearchDescription ||
				filter.SearchFields[2] != domain.VacancySearchCompanyName {
				t.Fatalf("expected default search fields, got %#v", filter.SearchFields)
			}
			if filter.Sort != domain.VacancySortDateDesc {
				t.Fatalf("expected default date sorting, got %q", filter.Sort)
			}
			wantCreatedAfter := fixedNow.Add(-3 * 24 * time.Hour)
			if filter.CreatedAfter == nil || !filter.CreatedAfter.Equal(wantCreatedAfter) {
				t.Fatalf("expected createdAfter %v, got %v", wantCreatedAfter, filter.CreatedAfter)
			}
			return []domain.Vacancy{}, nil
		},
	}
	service := NewService(repo)
	service.now = func() time.Time { return fixedNow }

	_, err := service.ListByFilterParams(context.Background(), domain.VacancyFilter{
		Keyword:      "go",
		Period:       domain.VacancyPeriodThreeDays,
		Page:         2,
		ItemsPerPage: 20,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
