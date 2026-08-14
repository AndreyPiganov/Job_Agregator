package http

import (
	"context"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
)

const requestIDHeader = "X-Request-ID"

type requestIDContextKey struct{}

func requestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := strings.TrimSpace(r.Header.Get(requestIDHeader))
		if uuid.Validate(requestID) != nil {
			requestID = uuid.NewString()
		}

		w.Header().Set(requestIDHeader, requestID)
		ctx := context.WithValue(r.Context(), requestIDContextKey{}, requestID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func RequestID(ctx context.Context) string {
	requestID, _ := ctx.Value(requestIDContextKey{}).(string)
	return requestID
}

func RequestLogger(r *http.Request) *slog.Logger {
	return slog.Default().With("request_id", RequestID(r.Context()))
}

func accessLogMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		startedAt := time.Now()
		response := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

		next.ServeHTTP(response, r)

		status := response.Status()
		if status == 0 {
			status = http.StatusOK
		}
		route := chi.RouteContext(r.Context()).RoutePattern()
		logger := RequestLogger(r)
		remoteIP := r.RemoteAddr
		if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
			remoteIP = host
		}
		level := slog.LevelInfo
		switch {
		case r.URL.Path == "/health":
			level = slog.LevelDebug
		case status >= http.StatusInternalServerError:
			level = slog.LevelError
		case status >= http.StatusBadRequest:
			level = slog.LevelWarn
		}
		logger.LogAttrs(
			r.Context(),
			level,
			"http request completed",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.String("route", route),
			slog.Int("status", status),
			slog.Int("bytes", response.BytesWritten()),
			slog.Int64("duration_ms", time.Since(startedAt).Milliseconds()),
			slog.String("remote_ip", remoteIP),
			slog.String("user_agent", r.UserAgent()),
		)
	})
}
