package vacancy

import (
	"context"

	domain "vacancy_service/internal/domain"
)

type repository interface {
	List(ctx context.Context, offset, limit int) ([]domain.Vacancy, error)
	GetByID(ctx context.Context, id int64) (domain.Vacancy, error)
	Create(ctx context.Context, input CreateVacancyInput) (domain.Vacancy, error)
	CreateBatch(ctx context.Context, inputs []CreateVacancyInput) ([]domain.Vacancy, error)
	ListByCompany(ctx context.Context, companyName string) ([]domain.Vacancy, error)
	ListBySalaryRange(ctx context.Context, minSalary, maxSalary float64) ([]domain.Vacancy, error)
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

// Pagination is the normalized input for listing vacancies.
type Pagination struct {
	Page         int
	ItemsPerPage int
}

type Service struct{ repo repository }

func NewService(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Health() map[string]string {
	return map[string]string{"status": "ok"}
}

func (s *Service) List(ctx context.Context, d Pagination) ([]domain.Vacancy, error) {
	offset := (d.Page - 1) * d.ItemsPerPage
	return s.repo.List(ctx, offset, d.ItemsPerPage)
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

func (s *Service) ListByCompany(ctx context.Context, companyName string) ([]domain.Vacancy, error) {
	return s.repo.ListByCompany(ctx, companyName)
}

func (s *Service) ListBySalaryRange(ctx context.Context, minSalary, maxSalary float64) ([]domain.Vacancy, error) {
	return s.repo.ListBySalaryRange(ctx, minSalary, maxSalary)
}
