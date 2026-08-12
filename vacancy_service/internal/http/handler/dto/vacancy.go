package dto

// CreateVacancyRequest is the JSON shape accepted by vacancy creation endpoints.
// Validation tags belong to the HTTP layer because they describe the public API.
type CreateVacancyRequest struct {
	Title       string  `json:"title" validate:"required,notblank,max=200"`
	Description string  `json:"description" validate:"required,notblank,max=10000"`
	Salary      float64 `json:"salary" validate:"gte=0"`
	City        string  `json:"city" validate:"required,notblank,max=100"`
	Link        string  `json:"link" validate:"required,notblank,url,max=2048"`
	CompanyName string  `json:"companyName" validate:"required,notblank,max=200"`
}

// CreateVacancyBatchRequest supports {"vacancies": [...]} batch payloads.
type CreateVacancyBatchRequest struct {
	Vacancies []CreateVacancyRequest `json:"vacancies" validate:"required,min=1,max=1000,dive"`
}

type VacancyFilterRequest struct {
	Keyword      string   `json:"q" validate:"omitempty,max=200"`
	Cities       []string `json:"city" validate:"omitempty,max=20,dive,notblank,max=100"`
	SearchFields []string `json:"search_field" validate:"omitempty,max=3,dive,oneof=title description company_name"`
	MinSalary    *float64 `json:"minSalary,omitempty" validate:"omitempty,gte=0"`
	MaxSalary    *float64 `json:"maxSalary,omitempty" validate:"omitempty,gte=0"`
	Sort         string   `json:"sort" validate:"omitempty,oneof=date_desc date_asc salary_desc salary_asc"`
	Period       string   `json:"period" validate:"omitempty,oneof=day 3_days week"`
	Page         int      `json:"page" validate:"min=1"`
	ItemsPerPage int      `json:"itemsPerPage" validate:"min=1,max=100"`
}
