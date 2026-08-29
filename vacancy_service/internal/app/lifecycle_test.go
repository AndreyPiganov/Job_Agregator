package app

import (
	"context"
	"io"
	"log/slog"
	"net"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
)

func TestRunServerStopsGRPCWhenContextIsCanceled(t *testing.T) {
	grpcListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen gRPC: %v", err)
	}

	grpcServer := &grpcRuntime{
		listener: grpcListener,
		server:   grpc.NewServer(),
		health:   health.NewServer(),
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	if err := runServer(ctx, logger, grpcServer); err != nil {
		t.Fatalf("runServer returned error: %v", err)
	}
}

func TestIsExpectedServerStop(t *testing.T) {
	tests := []error{
		grpc.ErrServerStopped,
		nil,
	}

	for _, err := range tests {
		if !isExpectedServerStop(err) {
			t.Fatalf("expected stop to be accepted: %v", err)
		}
	}
}
