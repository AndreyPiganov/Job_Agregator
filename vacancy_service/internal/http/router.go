package http

import (
	"net/http"
	"runtime/debug"

	apperror "vacancy_service/internal/error"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// VacancyHandler describes only the HTTP endpoints the router needs.
// The router is independent from concrete handler and service types.
type VacancyHandler interface {
	Health(http.ResponseWriter, *http.Request)
	List(http.ResponseWriter, *http.Request)
	GetByID(http.ResponseWriter, *http.Request)
	Create(http.ResponseWriter, *http.Request)
	CreateBatch(http.ResponseWriter, *http.Request)
	ListByFilterParams(http.ResponseWriter, *http.Request)
}

func NewRouter(vacancyHandler VacancyHandler) http.Handler {
	r := chi.NewRouter()
	r.Use(requestIDMiddleware)
	r.Use(middleware.RealIP)
	r.Use(accessLogMiddleware)
	r.Use(recoveryMiddleware)

	r.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		Error(w, apperror.NotFound("route not found"))
	})
	r.MethodNotAllowed(func(w http.ResponseWriter, _ *http.Request) {
		Error(w, apperror.MethodNotAllowed("method not allowed"))
	})

	RegisterRoutes(r, vacancyHandler)
	return r
}

func RegisterRoutes(r chi.Router, vacancyHandler VacancyHandler) {
	r.Get("/health", vacancyHandler.Health)
	r.Route("/vacancies", func(r chi.Router) {
		r.Get("/", vacancyHandler.List)
		r.Get("/filter", vacancyHandler.ListByFilterParams)
		r.Post("/", vacancyHandler.Create)
		r.Post("/batch", vacancyHandler.CreateBatch)
		r.Get("/{id}", vacancyHandler.GetByID)
	})
}

func recoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				RequestLogger(r).ErrorContext(r.Context(), "panic recovered", "panic", recovered, "stack", string(debug.Stack()))
				Error(w, apperror.Internal())
			}
		}()
		next.ServeHTTP(w, r)
	})
}
