package storage

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Open(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	if strings.TrimSpace(databaseURL) == "" {
		return nil, errors.New("DATABASE_URL is not defined")
	}

	// Prisma-style URLs often use ?schema=public. pgx expects search_path
	// instead, so we normalize the URL before opening the pool.
	normalizedURL, err := normalizeDatabaseURL(databaseURL)
	if err != nil {
		return nil, err
	}

	config, err := pgxpool.ParseConfig(normalizedURL)
	if err != nil {
		return nil, fmt.Errorf("parse pgx pool config: %w", err)
	}

	// These numbers control DB concurrency. MaxConns is the upper limit of
	// simultaneous PostgreSQL connections used by this service instance.
	config.MaxConns = 25
	config.MinConns = 2
	config.MaxConnLifetime = 30 * time.Minute
	config.HealthCheckPeriod = time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, err
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}

	return pool, nil
}

// normalizeDatabaseURL keeps docker-compose compatibility with old Prisma-style
// DATABASE_URL values: postgresql://.../job?schema=public.
func normalizeDatabaseURL(databaseURL string) (string, error) {
	parsed, err := url.Parse(databaseURL)
	if err != nil {
		return "", fmt.Errorf("parse database url: %w", err)
	}

	query := parsed.Query()
	if schema := query.Get("schema"); schema != "" {
		query.Del("schema")
		if query.Get("search_path") == "" {
			query.Set("search_path", schema)
		}
		parsed.RawQuery = query.Encode()
	}

	return parsed.String(), nil
}
