package db

import (
	"context"
	_ "embed"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed schema.sql
var schemaSQL string

// Migrate executes schema.sql on service startup.
//
// It is intentionally small and simple for now. For a bigger production system,
// use a real migration tool so schema changes are versioned and reversible.
func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	for _, statement := range strings.Split(schemaSQL, ";") {
		statement = strings.TrimSpace(statement)
		if statement == "" {
			continue
		}
		if _, err := pool.Exec(ctx, statement); err != nil {
			return err
		}
	}

	return nil
}
