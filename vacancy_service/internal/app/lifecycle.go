package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"google.golang.org/grpc"
)

type serverError struct {
	name string
	err  error
}

func runServers(ctx context.Context, logger *slog.Logger, httpServer *httpRuntime, grpcServer *grpcRuntime) error {
	serverErrors := make(chan serverError, 2)
	go func() {
		logger.Info("HTTP server started", "address", httpServer.listener.Addr().String())
		serverErrors <- serverError{name: "HTTP", err: httpServer.serve()}
	}()
	go func() {
		logger.Info("gRPC server started", "address", grpcServer.listener.Addr().String())
		serverErrors <- serverError{name: "gRPC", err: grpcServer.serve()}
	}()

	var serveErr error
	select {
	case serverErr := <-serverErrors:
		if !isExpectedServerStop(serverErr) {
			serveErr = fmt.Errorf("serve %s: %w", serverErr.name, serverErr.err)
		}
	case <-ctx.Done():
		logger.Info("vacancy service stopping", "reason", ctx.Err())
	}

	grpcServer.prepareShutdown()
	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()

	httpStopped := make(chan error, 1)
	grpcStopped := make(chan error, 1)
	go func() { httpStopped <- httpServer.shutdown(shutdownCtx) }()
	go func() { grpcStopped <- grpcServer.shutdown(shutdownCtx) }()

	var shutdownErr error
	for httpStopped != nil || grpcStopped != nil {
		select {
		case err := <-httpStopped:
			if err != nil {
				shutdownErr = errors.Join(shutdownErr, fmt.Errorf("shutdown HTTP server: %w", err))
			}
			httpStopped = nil
		case err := <-grpcStopped:
			shutdownErr = errors.Join(shutdownErr, err)
			grpcStopped = nil
		}
	}

	logger.Info("vacancy service stopped")
	return errors.Join(serveErr, shutdownErr)
}

func isExpectedServerStop(serverErr serverError) bool {
	if serverErr.err == nil {
		return true
	}
	return serverErr.name == "HTTP" && errors.Is(serverErr.err, http.ErrServerClosed) ||
		serverErr.name == "gRPC" && errors.Is(serverErr.err, grpc.ErrServerStopped)
}
