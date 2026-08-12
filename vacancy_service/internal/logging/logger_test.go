package logging

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestNewRoutesRecordsByLevel(t *testing.T) {
	directory := t.TempDir()
	logger, closer, err := New(slog.LevelDebug, directory)
	if err != nil {
		t.Fatalf("create logger: %v", err)
	}

	logger.DebugContext(context.Background(), "debug record")
	logger.InfoContext(context.Background(), "info record")
	logger.WarnContext(context.Background(), "warn record")
	logger.ErrorContext(context.Background(), "error record")
	if err := closer.Close(); err != nil {
		t.Fatalf("close logger: %v", err)
	}

	assertLogContains(t, directory, "debug.log", "debug record")
	assertLogContains(t, directory, "info.log", "info record")
	assertLogContains(t, directory, "warn.log", "warn record")
	assertLogContains(t, directory, "error.log", "error record")

	warnLog, err := os.ReadFile(filepath.Join(directory, "warn.log"))
	if err != nil {
		t.Fatalf("read warn log: %v", err)
	}
	if strings.Contains(string(warnLog), "info record") || strings.Contains(string(warnLog), "error record") {
		t.Fatalf("warn.log contains a record from another level: %s", warnLog)
	}
}

func assertLogContains(t *testing.T, directory, name, message string) {
	t.Helper()
	content, err := os.ReadFile(filepath.Join(directory, name))
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}
	if !strings.Contains(string(content), message) {
		t.Fatalf("expected %s to contain %q, got %s", name, message, content)
	}
}
