package repository

import (
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"vacancy_service/internal/db"
	"vacancy_service/internal/model"
)

func TestVacancyFromGetRowMapsCompanyAndTimestamps(t *testing.T) {
	createdAt := pgtype.Timestamp{Time: time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC), Valid: true}
	updatedAt := pgtype.Timestamp{Time: time.Date(2024, 1, 3, 4, 5, 6, 0, time.UTC), Valid: true}

	row := db.GetVacancyByIDRow{
		ID:             42,
		Title:          "Backend Engineer",
		Description:    "Build services",
		CompanyId:      7,
		Salary:         180000,
		Link:           "https://example.com/job",
		City:           "Remote",
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
		CompanyTableID: 7,
		CompanyName:    "Acme",
	}

	vacancy := vacancyFromGetRow(row)

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

func TestVacancyInputValidation(t *testing.T) {
	input := model.VacancyInput{Title: "", Description: "Some", Salary: 100, Company: &model.Company{Name: "Acme"}, City: "Moscow", Link: "https://example.com"}

	if err := input.Validate(); err == nil {
		t.Fatal("expected validation error for empty title")
	}
}
