package vacancy

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	domain "vacancy_service/internal/domain"
	"vacancy_service/internal/http/handler/dto"
	service "vacancy_service/internal/service"
	"vacancy_service/internal/validation"
)

type Service interface {
	List(ctx context.Context, p service.Pagination) ([]domain.Vacancy, error)
	GetByID(ctx context.Context, id int64) (domain.Vacancy, error)
	Create(ctx context.Context, input service.CreateVacancyInput) (domain.Vacancy, error)
	CreateBatch(ctx context.Context, inputs []service.CreateVacancyInput) ([]domain.Vacancy, error)
	ListByCompany(ctx context.Context, companyName string) ([]domain.Vacancy, error)
	ListBySalaryRange(ctx context.Context, minSalary, maxSalary float64) ([]domain.Vacancy, error)
}

type handler struct {
	// Handler owns HTTP concerns: reading query params/body, validation,
	// calling repository methods, and writing JSON responses.
	service Service
	logger  *slog.Logger
}

func NewHandler(service Service, logger *slog.Logger) *handler {
	return &handler{
		service: service,
		logger:  logger,
	}
}

func (h *handler) Health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *handler) List(w http.ResponseWriter, r *http.Request) {
	// Query params arrive as strings. Helpers parse them and provide defaults.
	page, err := queryInt(r, "page", 1)
	if err != nil || page < 1 {
		writeError(w, http.StatusBadRequest, "page must be a positive integer")
		return
	}
	limit, err := queryInt(r, "itemsPerPage", 10)
	if err != nil || limit < 1 {
		writeError(w, http.StatusBadRequest, "itemsPerPage must be a positive integer")
		return
	}

	p := service.Pagination{
		Page:         page,
		ItemsPerPage: limit,
	}
	if p.ItemsPerPage > 100 {
		p.ItemsPerPage = 100
	}

	vacancies, err := h.service.List(r.Context(), p)
	if err != nil {
		h.logger.Error("failed to list vacancies", "error", err)
		writeError(w, http.StatusInternalServerError, "could not fetch vacancies")
		return
	}

	writeJSON(w, http.StatusOK, vacancies)
}

func (h *handler) GetByID(w http.ResponseWriter, r *http.Request) {
	// The router matches /vacancies/{id}; here we manually extract the id from
	// the path because net/http keeps things deliberately simple.
	idText := strings.TrimPrefix(r.URL.Path, "/vacancies/")
	id, err := strconv.ParseInt(idText, 10, 64)
	if err != nil || id < 1 {
		writeError(w, http.StatusBadRequest, "invalid vacancy id")
		return
	}

	vacancy, err := h.service.GetByID(r.Context(), id)
	if errors.Is(err, domain.ErrVacancyNotFound) {
		writeError(w, http.StatusNotFound, "vacancy not found")
		return
	}
	if err != nil {
		h.logger.Error("failed to get vacancy", "id", id, "error", err)
		writeError(w, http.StatusInternalServerError, "could not fetch vacancy")
		return
	}

	writeJSON(w, http.StatusOK, vacancy)
}

func (h *handler) Create(w http.ResponseWriter, r *http.Request) {
	var dtoReq dto.CreateVacancyRequest
	// decode into DTO so we can validate tags using go-playground/validator
	if err := decodeJSON(r, &dtoReq); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON request body")
		return
	}
	if err := validation.Struct(dtoReq); err != nil {
		writeError(w, http.StatusBadRequest, validation.Message(err))
		return
	}

	input := service.CreateVacancyInput{
		Title:       strings.TrimSpace(dtoReq.Title),
		Description: strings.TrimSpace(dtoReq.Description),
		Salary:      float64(dtoReq.Salary),
		Link:        strings.TrimSpace(dtoReq.Link),
		City:        strings.TrimSpace(dtoReq.City),
		CompanyName: strings.TrimSpace(dtoReq.CompanyName),
	}
	vacancy, err := h.service.Create(r.Context(), input)
	if err != nil {
		h.logger.Error("failed to create vacancy", "error", err)
		writeError(w, http.StatusInternalServerError, "could not create vacancy")
		return
	}

	writeJSON(w, http.StatusCreated, vacancy)
}

func (h *handler) CreateBatch(w http.ResponseWriter, r *http.Request) {
	// Batch endpoint is meant for parser_service. It accepts many vacancies in
	// one HTTP request, then repository writes them in one transaction.
	// decode into DTOs first so we can validate tags
	dtoInputs, err := decodeBatchDTO(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON request body")
		return
	}
	if len(dtoInputs) == 0 {
		writeError(w, http.StatusBadRequest, "vacancies must not be empty")
		return
	}
	if len(dtoInputs) > 1000 {
		writeError(w, http.StatusBadRequest, "batch size must not exceed 1000 vacancies")
		return
	}
	// validate DTOs and map them to domain inputs
	inputs := make([]service.CreateVacancyInput, 0, len(dtoInputs))
	for _, d := range dtoInputs {
		if err := validation.Struct(d); err != nil {
			writeError(w, http.StatusBadRequest, validation.Message(err))
			return
		}
		in := service.CreateVacancyInput{
			Title:       strings.TrimSpace(d.Title),
			Description: strings.TrimSpace(d.Description),
			Salary:      float64(d.Salary),
			Link:        strings.TrimSpace(d.Link),
			City:        strings.TrimSpace(d.City),
			CompanyName: strings.TrimSpace(d.CompanyName),
		}
		inputs = append(inputs, in)
	}

	vacancies, err := h.service.CreateBatch(r.Context(), inputs)
	if err != nil {
		h.logger.Error("failed to create vacancy batch", "count", len(inputs), "error", err)
		writeError(w, http.StatusInternalServerError, "could not create vacancy batch")
		return
	}

	writeJSON(w, http.StatusCreated, vacancies)
}

func (h *handler) ListByCompany(w http.ResponseWriter, r *http.Request) {
	companyName, err := url.PathUnescape(strings.TrimPrefix(r.URL.Path, "/vacancies/company/"))
	if err != nil || strings.TrimSpace(companyName) == "" {
		writeError(w, http.StatusBadRequest, "invalid company name")
		return
	}

	vacancies, err := h.service.ListByCompany(r.Context(), companyName)
	if err != nil {
		h.logger.Error("failed to list vacancies by company", "company", companyName, "error", err)
		writeError(w, http.StatusInternalServerError, "could not fetch vacancies")
		return
	}

	writeJSON(w, http.StatusOK, vacancies)
}

func (h *handler) ListBySalary(w http.ResponseWriter, r *http.Request) {
	minSalary, err := queryFloat(r, "minSalary")
	if err != nil {
		writeError(w, http.StatusBadRequest, "minSalary is required and must be a number")
		return
	}
	maxSalary, err := queryFloat(r, "maxSalary")
	if err != nil {
		writeError(w, http.StatusBadRequest, "maxSalary is required and must be a number")
		return
	}
	if minSalary > maxSalary {
		writeError(w, http.StatusBadRequest, "minSalary must be less than or equal to maxSalary")
		return
	}

	vacancies, err := h.service.ListBySalaryRange(r.Context(), minSalary, maxSalary)
	if err != nil {
		h.logger.Error("failed to list vacancies by salary", "error", err)
		writeError(w, http.StatusInternalServerError, "could not fetch vacancies")
		return
	}

	writeJSON(w, http.StatusOK, vacancies)
}

func decodeJSON(r *http.Request, target any) error {
	defer r.Body.Close()

	decoder := json.NewDecoder(r.Body)
	// Reject unexpected JSON fields. This catches client/parser bugs early.
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return errors.New("request body must contain one JSON value")
	}

	return nil
}

func decodeBatchDTO(r *http.Request) ([]dto.CreateVacancyRequest, error) {
	var raw json.RawMessage
	if err := decodeJSON(r, &raw); err != nil {
		return nil, err
	}

	var inputs []dto.CreateVacancyRequest
	if err := json.Unmarshal(raw, &inputs); err == nil {
		return inputs, nil
	}

	var wrapped dto.CreateVacancyBatchRequest
	if err := json.Unmarshal(raw, &wrapped); err != nil {
		return nil, err
	}
	return wrapped.Vacancies, nil
}

func queryInt(r *http.Request, key string, fallback int) (int, error) {
	raw := r.URL.Query().Get(key)
	if raw == "" {
		return fallback, nil
	}
	return strconv.Atoi(raw)
}

func queryFloat(r *http.Request, key string) (float64, error) {
	value, err := strconv.ParseFloat(r.URL.Query().Get(key), 64)
	if err != nil || math.IsNaN(value) || math.IsInf(value, 0) {
		return 0, errors.New("invalid number")
	}
	return value, nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	// All handlers return JSON, including errors. This makes the API predictable
	// for parser_service and future frontend clients.
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, `{"error":"failed to encode response"}`, http.StatusInternalServerError)
		return
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
