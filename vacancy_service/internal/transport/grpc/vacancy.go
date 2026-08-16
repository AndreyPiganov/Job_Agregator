package grpcserver

import (
	"context"
	"errors"
	"log/slog"

	"vacancy_service/internal/domain"
	vacancyv1 "vacancy_service/internal/proto/vacancy/v1"
	"vacancy_service/internal/service"
	grpcmappers "vacancy_service/internal/transport/grpc/mappers"
	"vacancy_service/internal/transport/grpc/rpcerror"
)

type VacancyService interface {
	List(ctx context.Context, pagination domain.Pagination) ([]domain.Vacancy, error)
	GetByID(ctx context.Context, id int64) (domain.Vacancy, error)
	Create(ctx context.Context, input service.CreateVacancyInput) (domain.Vacancy, error)
	CreateBatch(ctx context.Context, inputs []service.CreateVacancyInput) ([]domain.Vacancy, error)
	ListByFilterParams(ctx context.Context, filter domain.VacancyFilter) ([]domain.Vacancy, error)
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

	vacancy, err := s.service.GetByID(ctx, id)
	if errors.Is(err, domain.ErrVacancyNotFound) {
		return nil, rpcerror.NotFoundf("vacancy with id %d not found", id)
	}
	if err != nil {
		s.logger.ErrorContext(ctx, "gRPC: failed to get vacancy", "vacancy_id", id, "error", err)
		return nil, rpcerror.FromService(err)
	}

	return &vacancyv1.GetVacancyResponse{Vacancy: grpcmappers.VacancyToProto(vacancy)}, nil
}

func (s *Server) ListVacancies(ctx context.Context, request *vacancyv1.ListVacanciesRequest) (*vacancyv1.ListVacanciesResponse, error) {
	params := grpcmappers.ListParamsFromProto(request)

	var vacancies []domain.Vacancy
	var err error
	if params.HasFilters {
		vacancies, err = s.service.ListByFilterParams(ctx, params.Filter)
	} else {
		vacancies, err = s.service.List(ctx, params.Pagination)
	}
	if err != nil {
		s.logger.ErrorContext(ctx, "gRPC: failed to list vacancies", "error", err)
		return nil, rpcerror.FromService(err)
	}

	return &vacancyv1.ListVacanciesResponse{
		Vacancies: grpcmappers.VacanciesToProto(vacancies),
		PageInfo: &vacancyv1.PageInfo{
			Page:         int32(params.Pagination.Page),
			ItemsPerPage: int32(params.Pagination.ItemsPerPage),
		},
	}, nil
}

func (s *Server) CreateVacancy(ctx context.Context, request *vacancyv1.CreateVacancyRequest) (*vacancyv1.CreateVacancyResponse, error) {
	input := grpcmappers.CreateInputFromProto(request)

	vacancy, err := s.service.Create(ctx, input)
	if err != nil {
		s.logger.ErrorContext(ctx, "gRPC: failed to create vacancy", "error", err)
		return nil, rpcerror.FromService(err)
	}
	s.logger.InfoContext(ctx, "gRPC: vacancy created", "vacancy_id", vacancy.ID, "company", input.CompanyName)

	return &vacancyv1.CreateVacancyResponse{Vacancy: grpcmappers.VacancyToProto(vacancy)}, nil
}

func (s *Server) BatchCreateVacancies(ctx context.Context, request *vacancyv1.BatchCreateVacanciesRequest) (*vacancyv1.BatchCreateVacanciesResponse, error) {
	inputs := grpcmappers.BatchCreateInputsFromProto(request)

	vacancies, err := s.service.CreateBatch(ctx, inputs)
	if err != nil {
		s.logger.ErrorContext(ctx, "gRPC: failed to create vacancy batch", "count", len(inputs), "error", err)
		return nil, rpcerror.FromService(err)
	}
	s.logger.InfoContext(ctx, "gRPC: vacancy batch created", "count", len(vacancies))

	return &vacancyv1.BatchCreateVacanciesResponse{Vacancies: grpcmappers.VacanciesToProto(vacancies)}, nil
}
