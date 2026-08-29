package postgres

import (
	"strings"
	"time"

	"vacancy_service/internal/domain"
	"vacancy_service/internal/repository"
)

const vacancyListQueryPrefix = `
SELECT
    vacancy.id,
    vacancy.title,
    vacancy.description,
    vacancy."companyId",
    vacancy.salary,
    vacancy.link,
    vacancy.city,
    vacancy."createdAt",
    vacancy."updatedAt",
    company.id,
    company.name
FROM "Vacancy" vacancy
JOIN "Company" company ON company.id = vacancy."companyId"
WHERE (NOT $1::boolean OR vacancy.salary >= $2::double precision)
  AND (NOT $3::boolean OR vacancy.salary <= $4::double precision)
  AND (NOT $5::boolean OR lower(vacancy.city) = ANY($6::text[]))
  AND (
      $7::text = ''
      OR ($8::boolean AND vacancy.title ILIKE '%' || $7 || '%')
      OR ($9::boolean AND vacancy.description ILIKE '%' || $7 || '%')
      OR ($10::boolean AND company.name ILIKE '%' || $7 || '%')
  )
  AND (NOT $11::boolean OR vacancy."createdAt" >= $12::timestamp)
ORDER BY `

type vacancyFilterQueryParams struct {
	hasMinSalary        bool
	minSalary           float64
	hasMaxSalary        bool
	maxSalary           float64
	hasCreatedAfter     bool
	createdAfter        time.Time
	cities              []string
	searchByTitle       bool
	searchByDescription bool
	searchByCompanyName bool
}

func buildVacancyListQuery(criteria repository.ListCriteria) (string, []any) {
	params := newVacancyFilterQueryParams(criteria)
	query := vacancyListQueryPrefix + vacancyOrderBy(criteria.Sort) + `
LIMIT $13 OFFSET $14`
	args := []any{
		params.hasMinSalary,
		params.minSalary,
		params.hasMaxSalary,
		params.maxSalary,
		len(params.cities) > 0,
		params.cities,
		criteria.Keyword,
		params.searchByTitle,
		params.searchByDescription,
		params.searchByCompanyName,
		params.hasCreatedAfter,
		params.createdAfter,
		criteria.Limit,
		criteria.Offset,
	}
	return query, args
}

func newVacancyFilterQueryParams(criteria repository.ListCriteria) vacancyFilterQueryParams {
	params := vacancyFilterQueryParams{
		cities:              append([]string(nil), criteria.Cities...),
		searchByTitle:       searchFieldEnabled(criteria.SearchFields, domain.VacancySearchTitle),
		searchByDescription: searchFieldEnabled(criteria.SearchFields, domain.VacancySearchDescription),
		searchByCompanyName: searchFieldEnabled(criteria.SearchFields, domain.VacancySearchCompanyName),
	}
	for index := range params.cities {
		params.cities[index] = strings.ToLower(params.cities[index])
	}
	if criteria.MinSalary != nil {
		params.hasMinSalary = true
		params.minSalary = *criteria.MinSalary
	}
	if criteria.MaxSalary != nil {
		params.hasMaxSalary = true
		params.maxSalary = *criteria.MaxSalary
	}
	if criteria.CreatedAfter != nil {
		params.hasCreatedAfter = true
		params.createdAfter = *criteria.CreatedAfter
	}
	return params
}

func vacancyOrderBy(sort domain.VacancySort) string {
	switch sort {
	case domain.VacancySortDateAsc:
		return `vacancy."createdAt" ASC, vacancy.id ASC`
	case domain.VacancySortSalaryDesc:
		return `vacancy.salary DESC, vacancy."createdAt" DESC, vacancy.id DESC`
	case domain.VacancySortSalaryAsc:
		return `vacancy.salary ASC, vacancy."createdAt" DESC, vacancy.id DESC`
	default:
		return `vacancy."createdAt" DESC, vacancy.id DESC`
	}
}

func searchFieldEnabled(fields []domain.VacancySearchField, wanted domain.VacancySearchField) bool {
	for _, field := range fields {
		if field == wanted {
			return true
		}
	}
	return false
}
