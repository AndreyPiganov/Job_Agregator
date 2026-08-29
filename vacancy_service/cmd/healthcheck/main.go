package main

import (
	"context"
	"fmt"
	"net"
	"os"
	"strings"
	"time"

	vacancyv1 "vacancy_service/internal/proto/vacancy/v1"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	healthv1 "google.golang.org/grpc/health/grpc_health_v1"
)

func main() {
	port := strings.TrimSpace(os.Getenv("GRPC_PORT"))
	if port == "" {
		port = "50051"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	connection, err := grpc.NewClient(
		net.JoinHostPort("127.0.0.1", port),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		exitWithError(fmt.Errorf("create gRPC health client: %w", err))
	}
	defer func() { _ = connection.Close() }()

	response, err := healthv1.NewHealthClient(connection).Check(ctx, &healthv1.HealthCheckRequest{
		Service: vacancyv1.VacancyService_ServiceDesc.ServiceName,
	})
	if err != nil {
		exitWithError(fmt.Errorf("check vacancy gRPC health: %w", err))
	}
	if response.GetStatus() != healthv1.HealthCheckResponse_SERVING {
		exitWithError(fmt.Errorf("vacancy gRPC service is %s", response.GetStatus()))
	}

	_, _ = fmt.Fprintln(os.Stdout, response.GetStatus())
}

func exitWithError(err error) {
	_, _ = fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
