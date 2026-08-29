package domain

import (
	"time"
)

// Vacancy is a domain entity independent from transport serialization.
type Vacancy struct {
	ID          int64
	Title       string
	Description string
	CompanyID   int64
	Salary      float64
	Link        string
	City        string
	CreatedAt   time.Time
	UpdatedAt   time.Time
	Company     *Company
}
