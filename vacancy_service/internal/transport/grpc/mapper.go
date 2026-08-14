package grpcserver

import (
	"time"

	"vacancy_service/internal/domain"
	vacancyv1 "vacancy_service/internal/proto/vacancy/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func vacanciesToProto(vacancies []domain.Vacancy) []*vacancyv1.Vacancy {
	result := make([]*vacancyv1.Vacancy, 0, len(vacancies))
	for _, vacancy := range vacancies {
		result = append(result, vacancyToProto(vacancy))
	}
	return result
}

func vacancyToProto(vacancy domain.Vacancy) *vacancyv1.Vacancy {
	result := &vacancyv1.Vacancy{
		Id:          vacancy.ID,
		Title:       vacancy.Title,
		Description: vacancy.Description,
		CompanyId:   vacancy.CompanyID,
		Salary:      vacancy.Salary,
		Link:        vacancy.Link,
		City:        vacancy.City,
		CreatedAt:   timestampToProto(vacancy.CreatedAt),
		UpdatedAt:   timestampToProto(vacancy.UpdatedAt),
	}
	if vacancy.Company != nil {
		result.Company = &vacancyv1.Company{
			Id:   vacancy.Company.ID,
			Name: vacancy.Company.Name,
		}
	}
	return result
}

func timestampToProto(value time.Time) *timestamppb.Timestamp {
	if value.IsZero() {
		return nil
	}
	return timestamppb.New(value)
}
