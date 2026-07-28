package http

import (
	"encoding/json"
	"net/http"

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
	ListByCompany(http.ResponseWriter, *http.Request)
	ListBySalary(http.ResponseWriter, *http.Request)
}

func NewRouter(vacancyHandler VacancyHandler) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)

	r.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		writeRouterError(w, http.StatusNotFound, "route not found")
	})
	r.MethodNotAllowed(func(w http.ResponseWriter, _ *http.Request) {
		writeRouterError(w, http.StatusMethodNotAllowed, "method not allowed")
	})

	RegisterRoutes(r, vacancyHandler)
	return r
}

func RegisterRoutes(r chi.Router, vacancyHandler VacancyHandler) {
	r.Get("/health", vacancyHandler.Health)
	r.Route("/vacancies", func(r chi.Router) {
		r.Get("/", vacancyHandler.List)
		r.Post("/", vacancyHandler.Create)
		r.Post("/batch", vacancyHandler.CreateBatch)
		r.Get("/salary", vacancyHandler.ListBySalary)
		r.Get("/company/{companyName}", vacancyHandler.ListByCompany)
		r.Get("/{id}", vacancyHandler.GetByID)
	})
}

func writeRouterError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
