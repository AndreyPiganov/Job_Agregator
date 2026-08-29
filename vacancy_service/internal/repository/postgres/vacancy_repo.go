package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	domain "vacancy_service/internal/domain"
	"vacancy_service/internal/repository"
	"vacancy_service/internal/repository/postgres/db"
)

// VacancyRepository is the PostgreSQL adapter for the application repository port.
type VacancyRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

var _ repository.VacancyRepository = (*VacancyRepository)(nil)

func NewVacancyRepository(pool *pgxpool.Pool) *VacancyRepository {
	return &VacancyRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *VacancyRepository) GetByID(ctx context.Context, id int64) (domain.Vacancy, error) {
	row, err := r.queries.GetVacancyByID(ctx, int32(id))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Vacancy{}, domain.ErrVacancyNotFound
	}
	if err != nil {
		return domain.Vacancy{}, fmt.Errorf("get vacancy by id %d: %w", id, err)
	}

	return vacancyFromJoinRow(row.Vacancy, row.Company), nil
}

func (r *VacancyRepository) Upsert(ctx context.Context, vacancy domain.Vacancy) (domain.Vacancy, error) {
	vacancies, err := r.UpsertBatch(ctx, []domain.Vacancy{vacancy})
	if err != nil {
		return domain.Vacancy{}, err
	}
	return vacancies[0], nil
}

func (r *VacancyRepository) UpsertBatch(ctx context.Context, inputs []domain.Vacancy) ([]domain.Vacancy, error) {
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
		if input.Company == nil {
			return nil, errors.New("upsert vacancy: company is required")
		}
		companyID, err := queries.UpsertCompany(ctx, input.Company.Name)
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
		vacancy.Company = &domain.Company{ID: int64(companyID), Name: input.Company.Name}
		vacancies = append(vacancies, vacancy)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit vacancy batch transaction: %w", err)
	}

	return vacancies, nil
}

func (r *VacancyRepository) List(ctx context.Context, criteria repository.ListCriteria) ([]domain.Vacancy, error) {
	query, args := buildVacancyListQuery(criteria)
	rows, err := r.pool.Query(ctx, query, args...)
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
