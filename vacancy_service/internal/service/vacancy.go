package service

import (
	"context"
	"errors"
	"log/slog"

	domain "vacancy_service/internal/domain"
	"vacancy_service/internal/repository"
)

type VacancyStore interface {
	List(ctx context.Context, offset, limit int) ([]domain.Vacancy, error)
	GetByID(ctx context.Context, id int64) (domain.Vacancy, error)
	Create(ctx context.Context, input domain.VacancyInput) (domain.Vacancy, error)
	CreateBatch(ctx context.Context, inputs []domain.VacancyInput) ([]domain.Vacancy, error)
	ListByCompany(ctx context.Context, companyName string) ([]domain.Vacancy, error)
	ListBySalaryRange(ctx context.Context, minSalary, maxSalary float64) ([]domain.Vacancy, error)
}

type VacancyService struct {
	repo   VacancyStore
	logger *slog.Logger
}

var (
	ErrVacancyNotFound = errors.New("vacancy not found")
)

func NewVacancyService(repo VacancyStore, logger *slog.Logger) *VacancyService {
	return &VacancyService{repo: repo, logger: logger}
}

func (s *VacancyService) Health() map[string]string {
	return map[string]string{"status": "ok"}
}

func (s *VacancyService) List(ctx context.Context, d domain.Pagination) ([]domain.Vacancy, error) {
	offset := (d.Page - 1) * d.ItemsPerPage
	return s.repo.List(ctx, offset, d.ItemsPerPage)
}

func (s *VacancyService) GetByID(ctx context.Context, id int64) (domain.Vacancy, error) {
	vacancy, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return domain.Vacancy{}, ErrVacancyNotFound
		}
		return domain.Vacancy{}, err
	}
	return vacancy, nil
}

func (s *VacancyService) Create(ctx context.Context, input domain.VacancyInput) (domain.Vacancy, error) {
	if err := input.Validate(); err != nil {
		return domain.Vacancy{}, err
	}
	return s.repo.Create(ctx, input)
}

func (s *VacancyService) CreateBatch(ctx context.Context, inputs []domain.VacancyInput) ([]domain.Vacancy, error) {
	for _, input := range inputs {
		if err := input.Validate(); err != nil {
			return nil, err
		}
	}
	return s.repo.CreateBatch(ctx, inputs)
}

func (s *VacancyService) ListByCompany(ctx context.Context, companyName string) ([]domain.Vacancy, error) {
	return s.repo.ListByCompany(ctx, companyName)
}

func (s *VacancyService) ListBySalaryRange(ctx context.Context, minSalary, maxSalary float64) ([]domain.Vacancy, error) {
	return s.repo.ListBySalaryRange(ctx, minSalary, maxSalary)
}
