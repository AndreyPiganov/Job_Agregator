package logging

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"

	"gopkg.in/natefinch/lumberjack.v2"
)

type levelHandler struct {
	handler slog.Handler
	level   slog.Level
	minimum slog.Level
	exact   bool
}

func (h levelHandler) Enabled(ctx context.Context, level slog.Level) bool {
	if level < h.minimum {
		return false
	}
	if h.exact {
		return level == h.level
	}
	return level >= h.level
}

func (h levelHandler) Handle(ctx context.Context, record slog.Record) error {
	return h.handler.Handle(ctx, record)
}

func (h levelHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	h.handler = h.handler.WithAttrs(attrs)
	return h
}

func (h levelHandler) WithGroup(name string) slog.Handler {
	h.handler = h.handler.WithGroup(name)
	return h
}

type multiHandler struct {
	handlers []slog.Handler
}

func (h multiHandler) Enabled(ctx context.Context, level slog.Level) bool {
	for _, handler := range h.handlers {
		if handler.Enabled(ctx, level) {
			return true
		}
	}
	return false
}

func (h multiHandler) Handle(ctx context.Context, record slog.Record) error {
	for _, handler := range h.handlers {
		if handler.Enabled(ctx, record.Level) {
			if err := handler.Handle(ctx, record.Clone()); err != nil {
				return err
			}
		}
	}
	return nil
}

func (h multiHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	h.handlers = cloneHandlers(h.handlers, func(handler slog.Handler) slog.Handler {
		return handler.WithAttrs(attrs)
	})
	return h
}

func (h multiHandler) WithGroup(name string) slog.Handler {
	h.handlers = cloneHandlers(h.handlers, func(handler slog.Handler) slog.Handler {
		return handler.WithGroup(name)
	})
	return h
}

func cloneHandlers(handlers []slog.Handler, transform func(slog.Handler) slog.Handler) []slog.Handler {
	cloned := make([]slog.Handler, len(handlers))
	for index, handler := range handlers {
		cloned[index] = transform(handler)
	}
	return cloned
}

type fileCloser struct {
	files []io.Closer
}

func (c *fileCloser) Close() error {
	var firstErr error
	for _, file := range c.files {
		if err := file.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}

// New writes enabled JSON logs to stdout and separates file logs by level.
func New(level slog.Level, directory string) (*slog.Logger, io.Closer, error) {
	if err := os.MkdirAll(directory, 0o750); err != nil {
		return nil, nil, fmt.Errorf("create log directory: %w", err)
	}

	handlers := []slog.Handler{
		slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level}),
	}
	closer := &fileCloser{}
	levels := []struct {
		name  string
		level slog.Level
		exact bool
	}{
		{name: "debug.log", level: slog.LevelDebug, exact: true},
		{name: "info.log", level: slog.LevelInfo, exact: true},
		{name: "warn.log", level: slog.LevelWarn, exact: true},
		{name: "error.log", level: slog.LevelError, exact: false},
	}

	for _, config := range levels {
		file := &lumberjack.Logger{
			Filename:   filepath.Join(directory, config.name),
			MaxSize:    20,
			MaxBackups: 5,
			MaxAge:     14,
			Compress:   true,
		}
		closer.files = append(closer.files, file)
		handlers = append(handlers, levelHandler{
			handler: slog.NewJSONHandler(file, nil),
			level:   config.level,
			minimum: level,
			exact:   config.exact,
		})
	}

	return slog.New(multiHandler{handlers: handlers}), closer, nil
}
