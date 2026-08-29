package repository

import (
	"context"
	"time"

	"vacancy_service/internal/domain"
)

// VacancyRepository is the persistence port required by VacancyService.
// Implementations may use PostgreSQL, memory, or another storage adapter.
type VacancyRepository interface {
	GetByID(ctx context.Context, id int64) (domain.Vacancy, error)
	List(ctx context.Context, criteria ListCriteria) ([]domain.Vacancy, error)
	Upsert(ctx context.Context, vacancy domain.Vacancy) (domain.Vacancy, error)
	UpsertBatch(ctx context.Context, vacancies []domain.Vacancy) ([]domain.Vacancy, error)
}

type ListCriteria struct {
	Keyword      string
	Cities       []string
	SearchFields []domain.VacancySearchField
	MinSalary    *float64
	MaxSalary    *float64
	Sort         domain.VacancySort
	CreatedAfter *time.Time
	Offset       int
	Limit        int
}
