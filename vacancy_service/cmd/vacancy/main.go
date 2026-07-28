package main

import (
	"context"
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
	vacancyRepository "vacancy_service/internal/repository"
	vacancyService "vacancy_service/internal/service"
	"vacancy_service/internal/storage"
	"vacancy_service/internal/validation"
)

func main() {
	// main is the composition root of the service:
	// here we create config, logger, database pool, repositories and HTTP server.
	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel}))
	validation.Init()

	// Startup work should not hang forever. If DB connection or migration takes
	// longer than 20 seconds, the context cancels those operations.
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	// pgxpool is a pool of PostgreSQL connections. Handlers reuse this pool
	// instead of opening a new connection for each HTTP request.
	pool, err := storage.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to open database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Migrate creates the minimal tables/indexes the service needs.
	// Later this can be replaced by a dedicated migration tool.
	if err := db.Migrate(ctx, pool); err != nil {
		logger.Error("failed to migrate database", "error", err)
		os.Exit(1)
	}

	// main wires concrete implementations together.
	// The dependency flow is: HTTP handler -> service -> repository -> database.
	vacancyR := vacancyRepository.NewVacancyRepository(pool)
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
	go func() {
		logger.Info("vacancy service started", "port", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("http server failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	// Graceful shutdown gives active requests a short window to finish before
	// the process exits. This is important in Docker/Kubernetes style runtimes.
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("http server shutdown failed", "error", err)
		os.Exit(1)
	}

	logger.Info("vacancy service stopped")
}
