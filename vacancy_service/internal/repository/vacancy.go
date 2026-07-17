package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"vacancy_service/internal/db"
	domain "vacancy_service/internal/domain"
)

var (
	ErrNotFound = errors.New("not found")
)

// VacancyRepository is the boundary between application code and database code.
//
// HTTP handlers call repository methods. The repository then calls sqlc-generated
// methods from internal/db. This keeps SQL details out of handlers.
type VacancyRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewVacancyRepository(pool *pgxpool.Pool) *VacancyRepository {
	return &VacancyRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *VacancyRepository) List(ctx context.Context, offset, limit int) ([]domain.Vacancy, error) {
	rows, err := r.queries.ListVacancies(ctx, db.ListVacanciesParams{
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, err
	}

	vacancies := make([]domain.Vacancy, 0, len(rows))
	for _, row := range rows {
		vacancies = append(vacancies, toDomainVacancy(row))
	}
	return vacancies, nil
}

func (r *VacancyRepository) GetByID(ctx context.Context, id int64) (domain.Vacancy, error) {
	row, err := r.queries.GetVacancyByID(ctx, int32(id))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Vacancy{}, ErrNotFound
	}
	if err != nil {
		return domain.Vacancy{}, err
	}

	return vacancyFromGetRow(row), nil
}

func (r *VacancyRepository) Create(ctx context.Context, input domain.VacancyInput) (domain.Vacancy, error) {
	vacancies, err := r.CreateBatch(ctx, []domain.VacancyInput{input})
	if err != nil {
		return domain.Vacancy{}, err
	}
	if len(vacancies) == 0 {
		return domain.Vacancy{}, ErrNotFound
	}
	return vacancies[0], nil
}

func (r *VacancyRepository) CreateBatch(ctx context.Context, inputs []domain.VacancyInput) ([]domain.Vacancy, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	queries := r.queries.WithTx(tx)
	vacancies := make([]domain.Vacancy, 0, len(inputs))

	for _, input := range inputs {
		companyName := ""
		if input.Company != nil {
			companyName = strings.TrimSpace(input.Company.Name)
		}
		if companyName == "" {
			return nil, errors.New("company name is required")
		}

		companyID, err := queries.UpsertCompany(ctx, companyName)
		if err != nil {
			return nil, err
		}

		row, err := queries.UpsertVacancy(ctx, db.UpsertVacancyParams{
			Title:       input.Title,
			Description: input.Description,
			CompanyId:   companyID,
			Salary:      input.Salary,
			Link:        input.Link,
			City:        input.City,
		})
		if err != nil {
			return nil, err
		}

		vacancies = append(vacancies, vacancyFromUpsertRow(row))
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return vacancies, nil
}

func (r *VacancyRepository) ListByCompany(ctx context.Context, companyName string) ([]domain.Vacancy, error) {
	rows, err := r.queries.ListVacanciesByCompany(ctx, companyName)
	if err != nil {
		return nil, err
	}

	vacancies := make([]domain.Vacancy, 0, len(rows))
	for _, row := range rows {
		vacancies = append(vacancies, vacancyFromCompanyRow(row))
	}

	return vacancies, nil
}

func (r *VacancyRepository) ListBySalaryRange(ctx context.Context, minSalary, maxSalary float64) ([]domain.Vacancy, error) {
	rows, err := r.queries.ListVacanciesBySalaryRange(ctx, db.ListVacanciesBySalaryRangeParams{
		Salary:   minSalary,
		Salary_2: maxSalary,
	})
	if err != nil {
		return nil, err
	}

	vacancies := make([]domain.Vacancy, 0, len(rows))
	for _, row := range rows {
		vacancies = append(vacancies, vacancyFromSalaryRow(row))
	}

	return vacancies, nil
}

func newVacancy(id int64, title, desc string, companyID int64, salary float64, link, city string, createdAt, updatedAt time.Time, company *domain.Company) domain.Vacancy {
	return domain.Vacancy{
		ID:          id,
		Title:       title,
		Description: desc,
		CompanyID:   companyID,
		Salary:      salary,
		Link:        link,
		City:        city,
		CreatedAt:   createdAt,
		UpdatedAt:   updatedAt,
		Company:     company, // может быть nil
	}
}

// internal/repository/mappers.go
func toDomainVacancy(v db.Vacancy) domain.Vacancy {
	return domain.Vacancy{
		ID:          int64(v.ID),
		Title:       v.Title,
		Description: v.Description,
		CompanyID:   int64(v.CompanyId),
		Salary:      v.Salary,
		Link:        v.Link,
		City:        v.City,
		CreatedAt:   v.CreatedAt.Time, // если используется pgtype.Timestamp
		UpdatedAt:   v.UpdatedAt.Time,
	}
}

// для GetVacancyByID и ListVacancies (где компания всегда есть)
func vacancyFromJoinRow(row interface {
	GetVacancy() db.Vacancy
	GetCompany() db.Company
}) domain.Vacancy {
	v := row.GetVacancy()
	c := row.GetCompany()
	result := toDomainVacancy(v)
	result.Company = &domain.Company{
		ID:   int64(c.ID),
		Name: c.Name,
	}
	return result
}

// func vacancyFromGetRow(row db.GetVacancyByIDRow) domain.Vacancy {
// 	vacancy := domain.Vacancy{
// 		ID:          int64(row.ID),
// 		Title:       row.Title,
// 		Description: row.Description,
// 		CompanyID:   int64(row.CompanyId),
// 		Salary:      row.Salary,
// 		Link:        row.Link,
// 		City:        row.City,
// 		CreatedAt:   timeFromPgTimestamp(row.CreatedAt),
// 		UpdatedAt:   timeFromPgTimestamp(row.UpdatedAt),
// 	}
// 	if row.CompanyName != "" {
// 		vacancy.Company = &domain.Company{ID: int64(row.CompanyTableID), Name: row.CompanyName}
// 	}
// 	return vacancy
// }

func vacancyFromListRow(row db.ListVacanciesRow) domain.Vacancy {
	vacancy := domain.Vacancy{
		ID:          int64(row.ID),
		Title:       row.Title,
		Description: row.Description,
		CompanyID:   int64(row.CompanyId),
		Salary:      row.Salary,
		Link:        row.Link,
		City:        row.City,
		CreatedAt:   timeFromPgTimestamp(row.CreatedAt),
		UpdatedAt:   timeFromPgTimestamp(row.UpdatedAt),
	}
	if row.CompanyName != "" {
		vacancy.Company = &domain.Company{ID: int64(row.CompanyTableID), Name: row.CompanyName}
	}
	return vacancy
}

func vacancyFromCompanyRow(row db.ListVacanciesByCompanyRow) domain.Vacancy {
	vacancy := domain.Vacancy{
		ID:          int64(row.ID),
		Title:       row.Title,
		Description: row.Description,
		CompanyID:   int64(row.CompanyId),
		Salary:      row.Salary,
		Link:        row.Link,
		City:        row.City,
		CreatedAt:   timeFromPgTimestamp(row.CreatedAt),
		UpdatedAt:   timeFromPgTimestamp(row.UpdatedAt),
	}
	if row.CompanyName != "" {
		vacancy.Company = &domain.Company{ID: int64(row.CompanyTableID), Name: row.CompanyName}
	}
	return vacancy
}

func vacancyFromSalaryRow(row db.ListVacanciesBySalaryRangeRow) domain.Vacancy {
	vacancy := domain.Vacancy{
		ID:          int64(row.ID),
		Title:       row.Title,
		Description: row.Description,
		CompanyID:   int64(row.CompanyId),
		Salary:      row.Salary,
		Link:        row.Link,
		City:        row.City,
		CreatedAt:   timeFromPgTimestamp(row.CreatedAt),
		UpdatedAt:   timeFromPgTimestamp(row.UpdatedAt),
	}
	if row.CompanyName != "" {
		vacancy.Company = &domain.Company{ID: int64(row.CompanyTableID), Name: row.CompanyName}
	}
	return vacancy
}

func vacancyFromUpsertRow(row db.UpsertVacancyRow) domain.Vacancy {
	return domain.Vacancy{
		ID:          int64(row.ID),
		Title:       row.Title,
		Description: row.Description,
		CompanyID:   int64(row.CompanyID),
		Salary:      row.Salary,
		Link:        row.Link,
		City:        row.City,
		CreatedAt:   timeFromPgTimestamp(row.CreatedAt),
		UpdatedAt:   timeFromPgTimestamp(row.UpdatedAt),
	}
}

func timeFromPgTimestamp(ts pgtype.Timestamp) time.Time {
	if ts.Valid {
		return ts.Time
	}
	return time.Time{}
}
