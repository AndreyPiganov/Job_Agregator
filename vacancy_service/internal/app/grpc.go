package app

import (
	"context"
	"fmt"
	"log/slog"
	"net"

	vacancyv1 "vacancy_service/internal/proto/vacancy/v1"
	grpcserver "vacancy_service/internal/transport/grpc"

	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	healthv1 "google.golang.org/grpc/health/grpc_health_v1"
)

type grpcRuntime struct {
	listener net.Listener
	server   *grpc.Server
	health   *health.Server
}

func newGRPCServer(port string, service grpcserver.VacancyService, logger *slog.Logger) (*grpcRuntime, error) {
	listener, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return nil, fmt.Errorf("listen gRPC on port %s: %w", port, err)
	}

	server := grpc.NewServer(
		grpc.ChainUnaryInterceptor(grpcserver.UnaryServerInterceptor(logger)),
	)
	vacancyv1.RegisterVacancyServiceServer(server, grpcserver.NewServer(service, logger))

	healthServer := health.NewServer()
	healthv1.RegisterHealthServer(server, healthServer)
	healthServer.SetServingStatus("", healthv1.HealthCheckResponse_SERVING)
	healthServer.SetServingStatus(vacancyv1.VacancyService_ServiceDesc.ServiceName, healthv1.HealthCheckResponse_SERVING)

	return &grpcRuntime{
		listener: listener,
		server:   server,
		health:   healthServer,
	}, nil
}

func (s *grpcRuntime) serve() error {
	return s.server.Serve(s.listener)
}

func (s *grpcRuntime) prepareShutdown() {
	s.health.Shutdown()
}

func (s *grpcRuntime) shutdown(ctx context.Context) error {
	stopped := make(chan struct{})
	go func() {
		s.server.GracefulStop()
		close(stopped)
	}()

	select {
	case <-stopped:
		return nil
	case <-ctx.Done():
		s.server.Stop()
		<-stopped
		return fmt.Errorf("shutdown gRPC server: %w", ctx.Err())
	}
}
