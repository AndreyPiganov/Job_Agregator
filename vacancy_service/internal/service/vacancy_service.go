package service

import (
	"context"
	"time"

	"vacancy_service/internal/domain"
	"vacancy_service/internal/repository"
	"vacancy_service/internal/service/dto"
)

type VacancyService struct {
	repository repository.VacancyRepository
	now        func() time.Time
}

func NewVacancyService(repository repository.VacancyRepository) *VacancyService {
	return &VacancyService{repository: repository, now: time.Now}
}

func (s *VacancyService) GetByID(ctx context.Context, id int64) (domain.Vacancy, error) {
	return s.repository.GetByID(ctx, id)
}

func (s *VacancyService) List(ctx context.Context, input dto.ListVacanciesInput) (dto.ListVacanciesResult, error) {
	page, itemsPerPage := normalizePagination(input.Page, input.ItemsPerPage)
	criteria := repository.ListCriteria{
		Keyword:      input.Keyword,
		Cities:       append([]string(nil), input.Cities...),
		SearchFields: append([]domain.VacancySearchField(nil), input.SearchFields...),
		MinSalary:    input.MinSalary,
		MaxSalary:    input.MaxSalary,
		Sort:         input.Sort,
		Offset:       (page - 1) * itemsPerPage,
		Limit:        itemsPerPage,
	}
	if criteria.Keyword != "" && len(criteria.SearchFields) == 0 {
		criteria.SearchFields = []domain.VacancySearchField{
			domain.VacancySearchTitle,
			domain.VacancySearchDescription,
			domain.VacancySearchCompanyName,
		}
	}
	if criteria.Sort == "" {
		criteria.Sort = domain.VacancySortDateDesc
	}
	if duration, ok := input.Period.Duration(); ok {
		createdAfter := s.now().UTC().Add(-duration)
		criteria.CreatedAfter = &createdAfter
	}

	vacancies, err := s.repository.List(ctx, criteria)
	if err != nil {
		return dto.ListVacanciesResult{}, err
	}
	return dto.ListVacanciesResult{
		Vacancies:    vacancies,
		Page:         page,
		ItemsPerPage: itemsPerPage,
	}, nil
}

func (s *VacancyService) Create(ctx context.Context, input dto.CreateVacancyInput) (domain.Vacancy, error) {
	return s.repository.Upsert(ctx, vacancyFromInput(input))
}

func (s *VacancyService) CreateBatch(ctx context.Context, inputs []dto.CreateVacancyInput) ([]domain.Vacancy, error) {
	vacancies := make([]domain.Vacancy, 0, len(inputs))
	for _, input := range inputs {
		vacancies = append(vacancies, vacancyFromInput(input))
	}
	return s.repository.UpsertBatch(ctx, vacancies)
}

func vacancyFromInput(input dto.CreateVacancyInput) domain.Vacancy {
	return domain.Vacancy{
		Title:       input.Title,
		Description: input.Description,
		Salary:      input.Salary,
		Link:        input.Link,
		City:        input.City,
		Company:     &domain.Company{Name: input.CompanyName},
	}
}

func normalizePagination(page, itemsPerPage int) (int, int) {
	if page < 1 {
		page = 1
	}
	if itemsPerPage < 1 {
		itemsPerPage = 10
	}
	if itemsPerPage > 100 {
		itemsPerPage = 100
	}
	return page, itemsPerPage
}
