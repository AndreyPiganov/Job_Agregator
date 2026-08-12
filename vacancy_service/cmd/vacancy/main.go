package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"vacancy_service/internal/config"
	"vacancy_service/internal/db"
	httpapi "vacancy_service/internal/http"
	vacancyHandler "vacancy_service/internal/http/handler"
	"vacancy_service/internal/logging"
	vacancyRepository "vacancy_service/internal/repository"
	vacancyService "vacancy_service/internal/service"
	"vacancy_service/internal/storage"
	"vacancy_service/internal/validation"
)

func main() {
	if err := run(); err != nil {
		_, _ = fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() (runErr error) {
	// main is the composition root of the service:
	// here we create config, logger, database pool, repositories and HTTP server.
	cfg := config.Load()
	logger, logFiles, err := logging.New(cfg.LogLevel, cfg.LogDir)
	if err != nil {
		return fmt.Errorf("configure logger: %w", err)
	}
	defer logFiles.Close()
	slog.SetDefault(logger)
	defer func() {
		if runErr != nil {
			logger.Error("vacancy service stopped with error", "error", runErr)
		}
	}()
	validation.Init()

	// Startup work should not hang forever. If DB connection or migration takes
	// longer than 20 seconds, the context cancels those operations.
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	// pgxpool is a pool of PostgreSQL connections. Handlers reuse this pool
	// instead of opening a new connection for each HTTP request.
	pool, err := storage.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer pool.Close()

	// Migrate creates the minimal tables/indexes the service needs.
	// Later this can be replaced by a dedicated migration tool.
	if err := db.Migrate(ctx, pool); err != nil {
		return fmt.Errorf("migrate database: %w", err)
	}

	// main wires concrete implementations together.
	// The dependency flow is: HTTP handler -> service -> repository -> database.
	vacancyR := vacancyRepository.NewRepository(pool)
	vacancyS := vacancyService.NewService(vacancyR)
	vacancyH := vacancyHandler.NewHandler(vacancyS, logger)

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      httpapi.NewRouter(vacancyH),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// ListenAndServe blocks, so it runs in a goroutine. The main goroutine below
	// waits for SIGINT/SIGTERM and then shuts the server down gracefully.
	serverErrors := make(chan error, 1)
	go func() {
		logger.Info("vacancy service started", "port", cfg.Port)
		serverErrors <- server.ListenAndServe()
	}()

	signalCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	select {
	case err := <-serverErrors:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("serve HTTP: %w", err)
		}
		return nil
	case <-signalCtx.Done():
	}

	// Graceful shutdown gives active requests a short window to finish before
	// the process exits. This is important in Docker/Kubernetes style runtimes.
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown HTTP server: %w", err)
	}

	logger.Info("vacancy service stopped")
	return nil
}
