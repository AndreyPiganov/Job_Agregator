package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"vacancy_service/internal/config"
	"vacancy_service/internal/db"
	"vacancy_service/internal/logging"
	vacancyRepository "vacancy_service/internal/repository"
	vacancyService "vacancy_service/internal/service"
	"vacancy_service/internal/storage"
)

func Run(ctx context.Context) (runErr error) {
	cfg := config.Load()
	logger, logFiles, err := logging.New(cfg.LogLevel, cfg.LogDir)
	if err != nil {
		return fmt.Errorf("configure logger: %w", err)
	}
	defer func() {
		runErr = errors.Join(runErr, logFiles.Close())
	}()
	slog.SetDefault(logger)
	defer func() {
		if runErr != nil {
			logger.Error("vacancy service stopped with error", "error", runErr)
		}
	}()

	startupCtx, cancelStartup := context.WithTimeout(ctx, 20*time.Second)
	defer cancelStartup()

	pool, err := storage.Open(startupCtx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer pool.Close()

	if err := db.Migrate(startupCtx, pool); err != nil {
		return fmt.Errorf("migrate database: %w", err)
	}
	cancelStartup()

	repository := vacancyRepository.NewRepository(pool)
	service := vacancyService.NewService(repository)
	httpServer, err := newHTTPServer(cfg.Port, service, logger)
	if err != nil {
		return err
	}
	grpcServer, err := newGRPCServer(cfg.GRPCPort, service, logger)
	if err != nil {
		return errors.Join(err, httpServer.listener.Close())
	}

	return runServers(ctx, logger, httpServer, grpcServer)
}
