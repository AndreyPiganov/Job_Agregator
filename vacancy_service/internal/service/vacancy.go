package vacancy

import (
	"context"
	"fmt"
	"strings"

	domain "vacancy_service/internal/domain"
)

type repository interface {
	List(ctx context.Context, offset, limit int) ([]domain.Vacancy, error)
	GetByID(ctx context.Context, id int64) (domain.Vacancy, error)
	Create(ctx context.Context, input CreateVacancyInput) (domain.Vacancy, error)
	CreateBatch(ctx context.Context, inputs []CreateVacancyInput) ([]domain.Vacancy, error)
	ListByCompany(ctx context.Context, companyName string) ([]domain.Vacancy, error)
	ListBySalaryRange(ctx context.Context, minSalary, maxSalary float64) ([]domain.Vacancy, error)
	ListByFilterParams(ctx context.Context, filter string, args ...interface{}) ([]domain.Vacancy, error)
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

func (s *Service) ListByFilterParams(ctx context.Context, filter domain.VacancyFilter) ([]domain.Vacancy, error) {
	conditions, args := BuildFilterConditions(filter)
	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ") // или " AND " — выбирайте логику
	}
	return s.repo.ListByFilterParams(ctx, whereClause, args...)
}

func BuildFilterConditions(filter domain.VacancyFilter) ([]string, []interface{}) {
	var conditions []string
	var args []interface{}
	argCounter := 1
	fmt.Println(filter)

	if filter.MinSalary > 0 {
		conditions = append(conditions, fmt.Sprintf("vacancy.salary >= $%d", argCounter))
		args = append(args, filter.MinSalary)
		argCounter++
	}

	if filter.MaxSalary > 0 {
		conditions = append(conditions, fmt.Sprintf("vacancy.salary <= $%d", argCounter))
		args = append(args, filter.MaxSalary)
		argCounter++
	}

	if filter.Keyword != "" {
		pattern := "%" + filter.Keyword + "%"
		conditions = append(conditions, fmt.Sprintf("vacancy.title ILIKE $%d OR vacancy.description ILIKE $%d", argCounter, argCounter))
		args = append(args, pattern) // один раз передаём паттерн
		argCounter++
	}

	return conditions, args
}
