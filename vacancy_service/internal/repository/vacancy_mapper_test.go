package repository

import (
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"vacancy_service/internal/db"
	"vacancy_service/internal/domain"
)

func TestVacancyFromGetRowMapsCompanyAndTimestamps(t *testing.T) {
	createdAt := pgtype.Timestamp{Time: time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC), Valid: true}
	updatedAt := pgtype.Timestamp{Time: time.Date(2024, 1, 3, 4, 5, 6, 0, time.UTC), Valid: true}

	row := db.GetVacancyByIDRow{
		Vacancy: db.Vacancy{
			ID:          42,
			Title:       "Backend Engineer",
			Description: "Build services",
			CompanyId:   7,
			Salary:      180000,
			Link:        "https://example.com/job",
			City:        "Remote",
			CreatedAt:   createdAt,
			UpdatedAt:   updatedAt,
		},
		Company: db.Company{ID: 7, Name: "Acme"},
	}

	vacancy := vacancyFromJoinRow(row.Vacancy, row.Company)

	if vacancy.ID != 42 {
		t.Fatalf("expected id 42, got %d", vacancy.ID)
	}
	if vacancy.Company == nil || vacancy.Company.Name != "Acme" {
		t.Fatalf("expected company to be mapped, got %#v", vacancy.Company)
	}
	if vacancy.CreatedAt != createdAt.Time {
		t.Fatalf("expected createdAt %v, got %v", createdAt.Time, vacancy.CreatedAt)
	}
	if vacancy.UpdatedAt != updatedAt.Time {
		t.Fatalf("expected updatedAt %v, got %v", updatedAt.Time, vacancy.UpdatedAt)
	}
}

func TestVacancyFromUpsertRowUsesDomainShape(t *testing.T) {
	createdAt := pgtype.Timestamp{Time: time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC), Valid: true}
	updatedAt := pgtype.Timestamp{Time: time.Date(2024, 1, 3, 4, 5, 6, 0, time.UTC), Valid: true}

	row := db.UpsertVacancyRow{
		ID:          12,
		Title:       "DevOps",
		Description: "Deploy",
		CompanyID:   9,
		Salary:      150000,
		Link:        "https://example.com/devops",
		City:        "Berlin",
		CreatedAt:   createdAt,
		UpdatedAt:   updatedAt,
	}

	vacancy := vacancyFromUpsertRow(row)
	if vacancy.CompanyID != 9 {
		t.Fatalf("expected companyId 9, got %d", vacancy.CompanyID)
	}
	if vacancy.Company != nil {
		t.Fatalf("expected company to be nil for upsert row, got %#v", vacancy.Company)
	}
	if vacancy.Title != "DevOps" {
		t.Fatalf("expected title %q, got %q", "DevOps", vacancy.Title)
	}
}

func TestNewVacancyFilterQueryParams(t *testing.T) {
	minSalary := 1000.0
	createdAfter := time.Date(2026, time.August, 9, 12, 0, 0, 0, time.UTC)
	filter := domain.VacancyFilter{
		MinSalary:    &minSalary,
		CreatedAfter: &createdAfter,
		Cities:       []string{"Moscow", "KAZAN"},
		SearchFields: []domain.VacancySearchField{domain.VacancySearchCompanyName},
	}

	params := newVacancyFilterQueryParams(filter)

	if !params.hasMinSalary || params.minSalary != minSalary {
		t.Fatalf("expected enabled min salary %v, got enabled=%v value=%v", minSalary, params.hasMinSalary, params.minSalary)
	}
	if params.hasMaxSalary {
		t.Fatal("expected absent max salary to stay disabled")
	}
	if !params.hasCreatedAfter || !params.createdAfter.Equal(createdAfter) {
		t.Fatalf("expected enabled createdAfter %v, got enabled=%v value=%v", createdAfter, params.hasCreatedAfter, params.createdAfter)
	}
	if len(params.cities) != 2 || params.cities[0] != "moscow" || params.cities[1] != "kazan" {
		t.Fatalf("expected normalized cities, got %#v", params.cities)
	}
	if params.searchByTitle || params.searchByDescription || !params.searchByCompanyName {
		t.Fatalf("unexpected search flags: %#v", params)
	}
	if filter.Cities[0] != "Moscow" {
		t.Fatalf("input filter was mutated: %#v", filter.Cities)
	}
}

func TestVacancyOrderBy(t *testing.T) {
	tests := map[domain.VacancySort]string{
		domain.VacancySortDateDesc:   `vacancy."createdAt" DESC, vacancy.id DESC`,
		domain.VacancySortDateAsc:    `vacancy."createdAt" ASC, vacancy.id ASC`,
		domain.VacancySortSalaryDesc: `vacancy.salary DESC, vacancy."createdAt" DESC, vacancy.id DESC`,
		domain.VacancySortSalaryAsc:  `vacancy.salary ASC, vacancy."createdAt" DESC, vacancy.id DESC`,
		"invalid":                    `vacancy."createdAt" DESC, vacancy.id DESC`,
	}

	for sort, expected := range tests {
		t.Run(string(sort), func(t *testing.T) {
			if actual := vacancyOrderBy(sort); actual != expected {
				t.Fatalf("expected %q, got %q", expected, actual)
			}
		})
	}
}
