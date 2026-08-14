package app

import (
	"context"
	"io"
	"log/slog"
	"net"
	"net/http"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
)

func TestRunServersStopsBothTransportsWhenContextIsCanceled(t *testing.T) {
	httpListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen HTTP: %v", err)
	}
	grpcListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		_ = httpListener.Close()
		t.Fatalf("listen gRPC: %v", err)
	}

	httpServer := &httpRuntime{
		listener: httpListener,
		server:   &http.Server{Handler: http.HandlerFunc(func(http.ResponseWriter, *http.Request) {})},
	}
	grpcServer := &grpcRuntime{
		listener: grpcListener,
		server:   grpc.NewServer(),
		health:   health.NewServer(),
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	if err := runServers(ctx, logger, httpServer, grpcServer); err != nil {
		t.Fatalf("runServers returned error: %v", err)
	}
}

func TestIsExpectedServerStop(t *testing.T) {
	tests := []serverError{
		{name: "HTTP", err: http.ErrServerClosed},
		{name: "gRPC", err: grpc.ErrServerStopped},
		{name: "HTTP", err: nil},
	}

	for _, test := range tests {
		if !isExpectedServerStop(test) {
			t.Fatalf("expected stop to be accepted: %#v", test)
		}
	}
}
