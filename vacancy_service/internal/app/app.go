package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"vacancy_service/internal/config"
	"vacancy_service/internal/logging"
	postgresAdapter "vacancy_service/internal/repository/postgres"
	"vacancy_service/internal/repository/postgres/db"
	"vacancy_service/internal/service"
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

	pool, err := postgresAdapter.Open(startupCtx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer pool.Close()

	if err := db.Migrate(startupCtx, pool); err != nil {
		return fmt.Errorf("migrate database: %w", err)
	}
	cancelStartup()

	repository := postgresAdapter.NewVacancyRepository(pool)
	vacancyService := service.NewVacancyService(repository)
	grpcServer, err := newGRPCServer(cfg.GRPCPort, vacancyService, logger)
	if err != nil {
		return err
	}

	return runServer(ctx, logger, grpcServer)
}
