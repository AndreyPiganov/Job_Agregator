package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
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

type vacancyFilterQueryParams struct {
	hasMinSalary        bool
	minSalary           float64
	hasMaxSalary        bool
	maxSalary           float64
	hasCreatedAfter     bool
	createdAfter        time.Time
	cities              []string
	searchByTitle       bool
	searchByDescription bool
	searchByCompanyName bool
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
	defer func() {
		rollbackCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
		defer cancel()
		_ = tx.Rollback(rollbackCtx)
	}()

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

		vacancy := vacancyFromUpsertRow(row)
		vacancy.Company = &domain.Company{ID: int64(companyID), Name: input.CompanyName}
		vacancies = append(vacancies, vacancy)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit vacancy batch transaction: %w", err)
	}

	return vacancies, nil
}

func (r *repository) ListByFilterParams(ctx context.Context, filter domain.VacancyFilter, offset, limit int) ([]domain.Vacancy, error) {
	const queryPrefix = `
SELECT
    vacancy.id,
    vacancy.title,
    vacancy.description,
    vacancy."companyId",
    vacancy.salary,
    vacancy.link,
    vacancy.city,
    vacancy."createdAt",
    vacancy."updatedAt",
    company.id,
    company.name
FROM "Vacancy" vacancy
JOIN "Company" company ON company.id = vacancy."companyId"
WHERE (NOT $1::boolean OR vacancy.salary >= $2::double precision)
  AND (NOT $3::boolean OR vacancy.salary <= $4::double precision)
  AND (NOT $5::boolean OR lower(vacancy.city) = ANY($6::text[]))
  AND (
      $7::text = ''
      OR ($8::boolean AND vacancy.title ILIKE '%' || $7 || '%')
      OR ($9::boolean AND vacancy.description ILIKE '%' || $7 || '%')
      OR ($10::boolean AND company.name ILIKE '%' || $7 || '%')
  )
  AND (NOT $11::boolean OR vacancy."createdAt" >= $12::timestamp)
ORDER BY `

	params := newVacancyFilterQueryParams(filter)
	query := queryPrefix + vacancyOrderBy(filter.Sort) + `
LIMIT $13 OFFSET $14`

	rows, err := r.pool.Query(
		ctx,
		query,
		params.hasMinSalary,
		params.minSalary,
		params.hasMaxSalary,
		params.maxSalary,
		len(params.cities) > 0,
		params.cities,
		filter.Keyword,
		params.searchByTitle,
		params.searchByDescription,
		params.searchByCompanyName,
		params.hasCreatedAfter,
		params.createdAfter,
		limit,
		offset,
	)
	if err != nil {
		return nil, fmt.Errorf("list vacancies by filter: %w", err)
	}
	defer rows.Close()

	vacancies := make([]domain.Vacancy, 0)
	for rows.Next() {
		var vacancy db.Vacancy
		var company db.Company
		if err := rows.Scan(
			&vacancy.ID,
			&vacancy.Title,
			&vacancy.Description,
			&vacancy.CompanyId,
			&vacancy.Salary,
			&vacancy.Link,
			&vacancy.City,
			&vacancy.CreatedAt,
			&vacancy.UpdatedAt,
			&company.ID,
			&company.Name,
		); err != nil {
			return nil, fmt.Errorf("scan filtered vacancy: %w", err)
		}

		vacancies = append(vacancies, vacancyFromJoinRow(vacancy, company))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate filtered vacancies: %w", err)
	}

	return vacancies, nil
}

func newVacancyFilterQueryParams(filter domain.VacancyFilter) vacancyFilterQueryParams {
	params := vacancyFilterQueryParams{
		cities:              append([]string(nil), filter.Cities...),
		searchByTitle:       searchFieldEnabled(filter.SearchFields, domain.VacancySearchTitle),
		searchByDescription: searchFieldEnabled(filter.SearchFields, domain.VacancySearchDescription),
		searchByCompanyName: searchFieldEnabled(filter.SearchFields, domain.VacancySearchCompanyName),
	}
	for index := range params.cities {
		params.cities[index] = strings.ToLower(params.cities[index])
	}
	if filter.MinSalary != nil {
		params.hasMinSalary = true
		params.minSalary = *filter.MinSalary
	}
	if filter.MaxSalary != nil {
		params.hasMaxSalary = true
		params.maxSalary = *filter.MaxSalary
	}
	if filter.CreatedAfter != nil {
		params.hasCreatedAfter = true
		params.createdAfter = *filter.CreatedAfter
	}
	return params
}

func vacancyOrderBy(sort domain.VacancySort) string {
	switch sort {
	case domain.VacancySortDateAsc:
		return `vacancy."createdAt" ASC, vacancy.id ASC`
	case domain.VacancySortSalaryDesc:
		return `vacancy.salary DESC, vacancy."createdAt" DESC, vacancy.id DESC`
	case domain.VacancySortSalaryAsc:
		return `vacancy.salary ASC, vacancy."createdAt" DESC, vacancy.id DESC`
	default:
		return `vacancy."createdAt" DESC, vacancy.id DESC`
	}
}

func searchFieldEnabled(fields []domain.VacancySearchField, wanted domain.VacancySearchField) bool {
	for _, field := range fields {
		if field == wanted {
			return true
		}
	}
	return false
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
