package app

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"time"

	httptransport "vacancy_service/internal/transport/http"
	"vacancy_service/internal/transport/http/handler"
	"vacancy_service/internal/transport/http/validation"
)

type httpRuntime struct {
	listener net.Listener
	server   *http.Server
}

func newHTTPServer(port string, service handler.Service, logger *slog.Logger) (*httpRuntime, error) {
	requestValidator, err := validation.New()
	if err != nil {
		return nil, fmt.Errorf("configure HTTP validator: %w", err)
	}

	listener, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return nil, fmt.Errorf("listen HTTP on port %s: %w", port, err)
	}
	vacancyHandler := handler.NewHandler(service, logger, requestValidator)

	return &httpRuntime{
		listener: listener,
		server: &http.Server{
			Handler:      httptransport.NewRouter(vacancyHandler),
			ReadTimeout:  10 * time.Second,
			WriteTimeout: 15 * time.Second,
			IdleTimeout:  60 * time.Second,
		},
	}, nil
}

func (s *httpRuntime) serve() error {
	return s.server.Serve(s.listener)
}

func (s *httpRuntime) shutdown(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}
