package config

import (
	"log/slog"
	"os"
	"strings"
)

type Config struct {
	Port        string
	DatabaseURL string
	LogLevel    slog.Level
	LogDir      string
}

func Load() Config {
	return Config{
		Port:        getEnv("PORT", "5003"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		LogLevel:    parseLogLevel(getEnv("LOG_LEVEL", "info")),
		LogDir:      getEnv("LOG_DIR", "var/log"),
	}
}

func getEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func parseLogLevel(value string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
