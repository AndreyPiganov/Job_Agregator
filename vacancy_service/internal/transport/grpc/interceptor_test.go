package grpcserver

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestUnaryServerInterceptorRecoversPanic(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	interceptor := UnaryServerInterceptor(logger)

	_, err := interceptor(
		context.Background(),
		nil,
		&grpc.UnaryServerInfo{FullMethod: "/test.Service/Panic"},
		func(context.Context, any) (any, error) {
			panic("unexpected failure")
		},
	)

	if status.Code(err) != codes.Internal {
		t.Fatalf("expected %s, got %s: %v", codes.Internal, status.Code(err), err)
	}
}
