package dto

// CreateVacancyRequest is the JSON shape accepted by vacancy creation endpoints.
// Validation tags belong to the HTTP layer because they describe the public API.
type CreateVacancyRequest struct {
	Title       string  `json:"title" validate:"required,notblank"`
	Description string  `json:"description" validate:"required,notblank"`
	Salary      float64 `json:"salary" validate:"gte=0"`
	City        string  `json:"city" validate:"required,notblank"`
	Link        string  `json:"link" validate:"required,notblank"`
	CompanyName string  `json:"companyName" validate:"required,notblank"`
}

// CreateVacancyBatchRequest supports {"vacancies": [...]} batch payloads.
type CreateVacancyBatchRequest struct {
	Vacancies []CreateVacancyRequest `json:"vacancies"`
}
