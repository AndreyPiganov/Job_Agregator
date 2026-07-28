package validation

import (
	"testing"

	"vacancy_service/internal/http/handler/dto"
)

func TestStructValidatesCreateVacancyRequest(t *testing.T) {
	valid := dto.CreateVacancyRequest{
		Title:       "Backend developer",
		Description: "Build services",
		Salary:      150000,
		City:        "Moscow",
		Link:        "https://example.com/vacancy/1",
		CompanyName: "Acme",
	}
	if err := Struct(valid); err != nil {
		t.Fatalf("expected valid request, got %v", err)
	}

	invalid := valid
	invalid.Title = "   "
	if err := Struct(invalid); err == nil {
		t.Fatal("expected whitespace-only title to be invalid")
	}

	invalid = valid
	invalid.Salary = -1
	if err := Struct(invalid); err == nil {
		t.Fatal("expected negative salary to be invalid")
	}
}
