package vacancy

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"vacancy_service/internal/db"
	domain "vacancy_service/internal/domain"
	service "vacancy_service/internal/service"
)

// VacancyRepository is the boundary between application code and database code.
//
// Services call repository methods. The repository then calls sqlc-generated
// methods from internal/db. This keeps SQL details out of higher layers.
type repository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewRepository(pool *pgxpool.Pool) *repository {
	return &repository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *repository) List(ctx context.Context, offset, limit int) ([]domain.Vacancy, error) {
	rows, err := r.queries.ListVacancies(ctx, db.ListVacanciesParams{
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, fmt.Errorf("list vacancies: %w", err)
	}

	vacancies := make([]domain.Vacancy, 0, len(rows))
	for _, row := range rows {
		vacancies = append(vacancies, vacancyFromJoinRow(row.Vacancy, row.Company))
	}
	return vacancies, nil
}

func (r *repository) GetByID(ctx context.Context, id int64) (domain.Vacancy, error) {
	row, err := r.queries.GetVacancyByID(ctx, int32(id))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Vacancy{}, domain.ErrVacancyNotFound
	}
	if err != nil {
		return domain.Vacancy{}, fmt.Errorf("get vacancy by id %d: %w", id, err)
	}

	return vacancyFromJoinRow(row.Vacancy, row.Company), nil
}

func (r *repository) Create(ctx context.Context, input service.CreateVacancyInput) (domain.Vacancy, error) {
	vacancies, err := r.CreateBatch(ctx, []service.CreateVacancyInput{input})
	if err != nil {
		return domain.Vacancy{}, err
	}
	return vacancies[0], nil
}

func (r *repository) CreateBatch(ctx context.Context, inputs []service.CreateVacancyInput) ([]domain.Vacancy, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin vacancy batch transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	queries := r.queries.WithTx(tx)
	vacancies := make([]domain.Vacancy, 0, len(inputs))

	for _, input := range inputs {
		companyID, err := queries.UpsertCompany(ctx, input.CompanyName)
		if err != nil {
			return nil, fmt.Errorf("upsert company: %w", err)
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
			return nil, fmt.Errorf("upsert vacancy: %w", err)
		}

		vacancies = append(vacancies, vacancyFromUpsertRow(row))
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit vacancy batch transaction: %w", err)
	}

	return vacancies, nil
}

func (r *repository) ListByCompany(ctx context.Context, companyName string) ([]domain.Vacancy, error) {
	rows, err := r.queries.ListVacanciesByCompany(ctx, companyName)
	if err != nil {
		return nil, fmt.Errorf("list vacancies by company: %w", err)
	}

	vacancies := make([]domain.Vacancy, 0, len(rows))
	for _, row := range rows {
		vacancies = append(vacancies, vacancyFromJoinRow(row.Vacancy, row.Company))
	}

	return vacancies, nil
}

func (r *repository) ListBySalaryRange(ctx context.Context, minSalary, maxSalary float64) ([]domain.Vacancy, error) {
	rows, err := r.queries.ListVacanciesBySalaryRange(ctx, db.ListVacanciesBySalaryRangeParams{
		Salary:   minSalary,
		Salary_2: maxSalary,
	})
	if err != nil {
		return nil, fmt.Errorf("list vacancies by salary range: %w", err)
	}

	vacancies := make([]domain.Vacancy, 0, len(rows))
	for _, row := range rows {
		vacancies = append(vacancies, vacancyFromJoinRow(row.Vacancy, row.Company))
	}

	return vacancies, nil
}

func (r *repository) ListByFilterParams(ctx context.Context, whereClause string, args ...interface{}) ([]domain.Vacancy, error) {
	query := `SELECT vacancy.* FROM "Vacancy" vacancy 
              JOIN "Company" company ON company."id" = vacancy."companyId" `
	if whereClause != "" {
		query += whereClause
	}
	query += ` ORDER BY vacancy."createdAt" DESC, vacancy."id" DESC`

	fmt.Println(query)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query error: %w", err)
	}
	defer rows.Close()

	vacancies, err := pgx.CollectRows(rows, pgx.RowToStructByName[domain.Vacancy])
	if err != nil {
		return nil, fmt.Errorf("collect rows error: %w", err)
	}

	return vacancies, nil
}

func toDomainVacancy(v db.Vacancy) domain.Vacancy {
	return domain.Vacancy{
		ID:          int64(v.ID),
		Title:       v.Title,
		Description: v.Description,
		CompanyID:   int64(v.CompanyId),
		Salary:      v.Salary,
		Link:        v.Link,
		City:        v.City,
		CreatedAt:   timeFromPgTimestamp(v.CreatedAt),
		UpdatedAt:   timeFromPgTimestamp(v.UpdatedAt),
	}
}

func vacancyFromJoinRow(v db.Vacancy, c db.Company) domain.Vacancy {
	result := toDomainVacancy(v)
	result.Company = &domain.Company{
		ID:   int64(c.ID),
		Name: c.Name,
	}
	return result
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
