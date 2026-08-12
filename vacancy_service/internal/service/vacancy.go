package service

import (
	"context"
	"time"

	domain "vacancy_service/internal/domain"
)

type repository interface {
	List(ctx context.Context, offset, limit int) ([]domain.Vacancy, error)
	GetByID(ctx context.Context, id int64) (domain.Vacancy, error)
	Create(ctx context.Context, input CreateVacancyInput) (domain.Vacancy, error)
	CreateBatch(ctx context.Context, inputs []CreateVacancyInput) ([]domain.Vacancy, error)
	ListByFilterParams(ctx context.Context, filter domain.VacancyFilter, offset, limit int) ([]domain.Vacancy, error)
}

// CreateVacancyInput is a service command, independent from HTTP JSON and SQL.
type CreateVacancyInput struct {
	Title       string
	Description string
	Salary      float64
	CompanyName string
	City        string
	Link        string
}

type Service struct {
	repo repository
	now  func() time.Time
}

func NewService(repo repository) *Service {
	return &Service{repo: repo, now: time.Now}
}

func (s *Service) List(ctx context.Context, pagination domain.Pagination) ([]domain.Vacancy, error) {
	pagination.Normalize()
	offset := (pagination.Page - 1) * pagination.ItemsPerPage
	return s.repo.List(ctx, offset, pagination.ItemsPerPage)
}

func (s *Service) GetByID(ctx context.Context, id int64) (domain.Vacancy, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Create(ctx context.Context, input CreateVacancyInput) (domain.Vacancy, error) {
	return s.repo.Create(ctx, input)
}

func (s *Service) CreateBatch(ctx context.Context, inputs []CreateVacancyInput) ([]domain.Vacancy, error) {
	return s.repo.CreateBatch(ctx, inputs)
}

func (s *Service) ListByFilterParams(ctx context.Context, filter domain.VacancyFilter) ([]domain.Vacancy, error) {
	pagination := domain.Pagination{Page: filter.Page, ItemsPerPage: filter.ItemsPerPage}
	pagination.Normalize()
	filter.Page = pagination.Page
	filter.ItemsPerPage = pagination.ItemsPerPage
	if filter.Keyword != "" && len(filter.SearchFields) == 0 {
		filter.SearchFields = []domain.VacancySearchField{
			domain.VacancySearchTitle,
			domain.VacancySearchDescription,
			domain.VacancySearchCompanyName,
		}
	}
	if filter.Sort == "" {
		filter.Sort = domain.VacancySortDateDesc
	}
	if duration, ok := filter.Period.Duration(); ok {
		createdAfter := s.now().UTC().Add(-duration)
		filter.CreatedAfter = &createdAfter
	}
	offset := (pagination.Page - 1) * pagination.ItemsPerPage

	return s.repo.ListByFilterParams(ctx, filter, offset, pagination.ItemsPerPage)
}
