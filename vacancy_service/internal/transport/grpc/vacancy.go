package grpcserver

import (
	"context"
	"errors"
	"log/slog"

	"vacancy_service/internal/domain"
	vacancyv1 "vacancy_service/internal/proto/vacancy/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type VacancyService interface {
	List(ctx context.Context, pagination domain.Pagination) ([]domain.Vacancy, error)
	GetByID(ctx context.Context, id int64) (domain.Vacancy, error)
}

type Server struct {
	vacancyv1.UnimplementedVacancyServiceServer

	service VacancyService
	logger  *slog.Logger
}

func NewServer(service VacancyService, logger *slog.Logger) *Server {
	return &Server{
		service: service,
		logger:  logger,
	}
}

func (s *Server) GetVacancy(ctx context.Context, request *vacancyv1.GetVacancyRequest) (*vacancyv1.GetVacancyResponse, error) {
	id := request.GetId()
	if id < 1 {
		return nil, status.Error(codes.InvalidArgument, "id must be a positive integer")
	}

	vacancy, err := s.service.GetByID(ctx, id)
	if errors.Is(err, domain.ErrVacancyNotFound) {
		return nil, status.Errorf(codes.NotFound, "vacancy with id %d not found", id)
	}
	if err != nil {
		s.logger.ErrorContext(ctx, "gRPC: failed to get vacancy", "vacancy_id", id, "error", err)
		return nil, serviceError(err)
	}

	return &vacancyv1.GetVacancyResponse{Vacancy: vacancyToProto(vacancy)}, nil
}

func (s *Server) ListVacancies(ctx context.Context, request *vacancyv1.ListVacanciesRequest) (*vacancyv1.ListVacanciesResponse, error) {
	pagination, err := paginationFromProto(request)
	if err != nil {
		return nil, err
	}

	vacancies, err := s.service.List(ctx, pagination)
	if err != nil {
		s.logger.ErrorContext(ctx, "gRPC: failed to list vacancies", "error", err)
		return nil, serviceError(err)
	}

	return &vacancyv1.ListVacanciesResponse{
		Vacancies: vacanciesToProto(vacancies),
		PageInfo: &vacancyv1.PageInfo{
			Page:         int32(pagination.Page),
			ItemsPerPage: int32(pagination.ItemsPerPage),
		},
	}, nil
}

func paginationFromProto(request *vacancyv1.ListVacanciesRequest) (domain.Pagination, error) {
	var pagination domain.Pagination
	if request != nil {
		if request.Page != nil {
			if request.GetPage() < 1 {
				return domain.Pagination{}, status.Error(codes.InvalidArgument, "page must be a positive integer")
			}
			pagination.Page = int(request.GetPage())
		}
		if request.ItemsPerPage != nil {
			if request.GetItemsPerPage() < 1 {
				return domain.Pagination{}, status.Error(codes.InvalidArgument, "items_per_page must be a positive integer")
			}
			pagination.ItemsPerPage = int(request.GetItemsPerPage())
		}
	}

	pagination.Normalize()
	return pagination, nil
}

func serviceError(err error) error {
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return status.FromContextError(err).Err()
	}
	return status.Error(codes.Internal, "internal server error")
}
