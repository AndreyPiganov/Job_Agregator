package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"google.golang.org/grpc"
)

func runServer(ctx context.Context, logger *slog.Logger, grpcServer *grpcRuntime) error {
	serverErrors := make(chan error, 1)
	go func() {
		logger.Info("gRPC server started", "address", grpcServer.listener.Addr().String())
		serverErrors <- grpcServer.serve()
	}()

	var serveErr error
	select {
	case err := <-serverErrors:
		if !isExpectedServerStop(err) {
			serveErr = fmt.Errorf("serve gRPC: %w", err)
		}
	case <-ctx.Done():
		logger.Info("vacancy service stopping", "reason", ctx.Err())
	}

	grpcServer.prepareShutdown()
	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()

	shutdownErr := grpcServer.shutdown(shutdownCtx)

	logger.Info("vacancy service stopped")
	return errors.Join(serveErr, shutdownErr)
}

func isExpectedServerStop(err error) bool {
	return err == nil || errors.Is(err, grpc.ErrServerStopped)
}
