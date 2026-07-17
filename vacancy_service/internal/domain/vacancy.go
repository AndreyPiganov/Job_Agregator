package domain

import (
	"errors"
	"strings"
	"time"
)

// Company is the API/domain representation of a company.
// It is separate from sqlc-generated db.Company on purpose: API structs can
// evolve independently from database structs.
type Company struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

func (c *Company) Normalize() {
	if c == nil {
		return
	}
	c.Name = strings.TrimSpace(c.Name)
}

func (c *Company) Validate() error {
	if c == nil {
		return errors.New("company is required")
	}
	if strings.TrimSpace(c.Name) == "" {
		return errors.New("company is required")
	}
	return nil
}

// Vacancy is what the HTTP API returns to clients.
// JSON tags define field names in responses, for example companyId instead of CompanyID.
type Vacancy struct {
	ID          int64     `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	CompanyID   int64     `json:"companyId"`
	Salary      float64   `json:"salary"`
	Link        string    `json:"link"`
	City        string    `json:"city"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	Company     *Company  `json:"company,omitempty"`
}

type CreateVacancyRequest struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Salary      float64 `json:"salary"`
	City        string  `json:"city"`
	Link        string  `json:"link"`
	CompanyName string  `json:"companyName"`
}

// VacancyInput is what clients/parser_service send when creating vacancies.
type VacancyInput struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Salary      float64  `json:"salary"`
	Company     *Company `json:"company"`
	City        string   `json:"city"`
	Link        string   `json:"link"`
}

func (i VacancyInput) Validate() error {
	switch {
	case strings.TrimSpace(i.Title) == "":
		return errors.New("title is required")
	case strings.TrimSpace(i.Description) == "":
		return errors.New("description is required")
	case i.Salary < 0:
		return errors.New("salary must be greater than or equal to zero")
	case i.Company == nil:
		return errors.New("company is required")
	case strings.TrimSpace(i.Company.Name) == "":
		return errors.New("company is required")
	case strings.TrimSpace(i.City) == "":
		return errors.New("city is required")
	case strings.TrimSpace(i.Link) == "":
		return errors.New("link is required")
	}
	return nil
}

// BatchVacancyInput supports {"vacancies": [...]} payloads for parser imports.
type BatchVacancyInput struct {
	Vacancies []VacancyInput `json:"vacancies"`
}
