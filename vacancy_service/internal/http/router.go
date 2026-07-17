package http

import (
	"log/slog"
	"net/http"

	handler "vacancy_service/internal/http/handler"
	service "vacancy_service/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func NewRouter(vacancies *service.VacancyService, logger *slog.Logger) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	vacancyHandler := handler.NewVacancyHandler(vacancies, logger)

	r.Route("/vacancies", func(r chi.Router) {
		r.Get("/health", vacancyHandler.Health)
		r.Get("/", vacancyHandler.List)
		r.Post("/", vacancyHandler.Create)
		r.Post("/batch", vacancyHandler.CreateBatch)
		r.Get("/salary", vacancyHandler.ListBySalary)
		r.Get("/company/{companyName}", vacancyHandler.ListByCompany)
		r.Get("/{id}", vacancyHandler.GetByID)
	})

	return r
}
