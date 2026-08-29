package postgres

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"vacancy_service/internal/domain"
	"vacancy_service/internal/repository/postgres/db"
)

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
	result.Company = &domain.Company{ID: int64(c.ID), Name: c.Name}
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

func timeFromPgTimestamp(timestamp pgtype.Timestamp) time.Time {
	if timestamp.Valid {
		return timestamp.Time
	}
	return time.Time{}
}
