package domain

import (
	"errors"
	"strings"
	"time"
)

var ErrVacancyNotFound = errors.New("vacancy not found")

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
