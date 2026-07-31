package domain

type VacancyFilter struct {
	Keyword string `json:"q" validate:"omitempty,max=200"`
	// Cities       []string `json:"city" validate:"omitempty,dive,max=100"`
	MinSalary    int `json:"minSalary" validate:"omitempty,gte=0"`
	MaxSalary    int `json:"maxSalary" validate:"omitempty,gtefield=minSalary"`
	Page         int `json:"page" validate:"omitempty,min=1,max=100"`
	ItemsPerPage int `json:"itemsPerPage" validate:"omitempty,min=0"`
}
