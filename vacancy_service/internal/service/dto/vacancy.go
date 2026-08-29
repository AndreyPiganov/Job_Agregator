package dto

import "vacancy_service/internal/domain"

type CreateVacancyInput struct {
	Title       string
	Description string
	Salary      float64
	CompanyName string
	City        string
	Link        string
}

type ListVacanciesInput struct {
	Page         int
	ItemsPerPage int
	Keyword      string
	Cities       []string
	SearchFields []domain.VacancySearchField
	MinSalary    *float64
	MaxSalary    *float64
	Sort         domain.VacancySort
	Period       domain.VacancyPeriod
}

type ListVacanciesResult struct {
	Vacancies    []domain.Vacancy
	Page         int
	ItemsPerPage int
}
