package grpcserver

import (
	"context"
	"net"
	"testing"

	"vacancy_service/internal/domain"
	vacancyv1 "vacancy_service/internal/proto/vacancy/v1"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"
)

func TestVacancyServiceOverGRPC(t *testing.T) {
	listener := bufconn.Listen(1 << 20)
	grpcServer := grpc.NewServer()
	vacancyv1.RegisterVacancyServiceServer(grpcServer, newTestServer(stubVacancyService{
		getByID: func(_ context.Context, id int64) (domain.Vacancy, error) {
			return domain.Vacancy{ID: id, Title: "Go developer"}, nil
		},
	}))

	go func() {
		_ = grpcServer.Serve(listener)
	}()
	t.Cleanup(grpcServer.Stop)

	connection, err := grpc.NewClient(
		"passthrough:///bufnet",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) {
			return listener.Dial()
		}),
	)
	if err != nil {
		t.Fatalf("create gRPC client connection: %v", err)
	}
	t.Cleanup(func() { _ = connection.Close() })

	client := vacancyv1.NewVacancyServiceClient(connection)
	response, err := client.GetVacancy(context.Background(), &vacancyv1.GetVacancyRequest{Id: 42})
	if err != nil {
		t.Fatalf("GetVacancy over gRPC returned error: %v", err)
	}
	if response.GetVacancy().GetId() != 42 || response.GetVacancy().GetTitle() != "Go developer" {
		t.Fatalf("unexpected response: %v", response)
	}
}
