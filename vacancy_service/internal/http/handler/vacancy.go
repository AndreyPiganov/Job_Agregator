package http

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	domain "vacancy_service/internal/domain"
	"vacancy_service/internal/repository"
	"vacancy_service/internal/service"
	"vacancy_service/internal/validation"
)

type VacancyHandler struct {
	// Handler owns HTTP concerns: reading query params/body, validation,
	// calling repository methods, and writing JSON responses.
	vacancies *service.VacancyService
	logger    *slog.Logger
}

type Pagination struct {
	Page         int
	ItemsPerPage int
}

func NewVacancyHandler(vacancies *service.VacancyService, logger *slog.Logger) *VacancyHandler {
	return &VacancyHandler{
		vacancies: vacancies,
		logger:    logger,
	}
}

func (h *VacancyHandler) Health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *VacancyHandler) List(w http.ResponseWriter, r *http.Request) {
	// Query params arrive as strings. Helpers parse them and provide defaults.
	page := queryInt(r, "page", 1)
	limit := queryInt(r, "itemsPerPage", 10)

	p := domain.Pagination{
		Page:         page,
		ItemsPerPage: limit,
	}

	p.Normalize()

	vacancies, err := h.vacancies.List(r.Context(), p)
	if err != nil {
		h.logger.Error("failed to list vacancies", "error", err)
		writeError(w, http.StatusInternalServerError, "could not fetch vacancies")
		return
	}

	writeJSON(w, http.StatusOK, vacancies)
}

func (h *VacancyHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	// The router matches /vacancies/{id}; here we manually extract the id from
	// the path because net/http keeps things deliberately simple.
	idText := strings.TrimPrefix(r.URL.Path, "/vacancies/")
	id, err := strconv.ParseInt(idText, 10, 64)
	if err != nil || id < 1 {
		writeError(w, http.StatusBadRequest, "invalid vacancy id")
		return
	}

	vacancy, err := h.vacancies.GetByID(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
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

func (h *VacancyHandler) Create(w http.ResponseWriter, r *http.Request) {
	var dtoReq domain.CreateVacancyRequest
	// decode into DTO so we can validate tags using go-playground/validator
	if err := decodeJSON(r, &dtoReq); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if validation.Validate != nil {
		if err := validation.Validate.Struct(dtoReq); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	// map DTO -> domain domain and run domain validation
	input := domain.VacancyInput{
		Title:       dtoReq.Title,
		Description: dtoReq.Description,
		Salary:      float64(dtoReq.Salary),
		Link:        dtoReq.Link,
		City:        dtoReq.City,
		Company:     &domain.Company{Name: dtoReq.CompanyName},
	}
	if err := validateVacancyInput(input); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	vacancy, err := h.vacancies.Create(r.Context(), input)
	if err != nil {
		h.logger.Error("failed to create vacancy", "error", err)
		writeError(w, http.StatusInternalServerError, "could not create vacancy")
		return
	}

	writeJSON(w, http.StatusCreated, vacancy)
}

func (h *VacancyHandler) CreateBatch(w http.ResponseWriter, r *http.Request) {
	// Batch endpoint is meant for parser_service. It accepts many vacancies in
	// one HTTP request, then repository writes them in one transaction.
	// decode into DTOs first so we can validate tags
	dtoInputs, err := decodeBatchDTO(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
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
	inputs := make([]domain.VacancyInput, 0, len(dtoInputs))
	for _, d := range dtoInputs {
		if validation.Validate != nil {
			if err := validation.Validate.Struct(d); err != nil {
				writeError(w, http.StatusBadRequest, err.Error())
				return
			}
		}
		in := domain.VacancyInput{
			Title:       d.Title,
			Description: d.Description,
			Salary:      float64(d.Salary),
			Link:        d.Link,
			City:        d.City,
			Company:     &domain.Company{Name: d.CompanyName},
		}
		if err := validateVacancyInput(in); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		inputs = append(inputs, in)
	}

	vacancies, err := h.vacancies.CreateBatch(r.Context(), inputs)
	if err != nil {
		h.logger.Error("failed to create vacancy batch", "count", len(inputs), "error", err)
		writeError(w, http.StatusInternalServerError, "could not create vacancy batch")
		return
	}

	writeJSON(w, http.StatusCreated, vacancies)
}

func (h *VacancyHandler) ListByCompany(w http.ResponseWriter, r *http.Request) {
	companyName, err := url.PathUnescape(strings.TrimPrefix(r.URL.Path, "/vacancies/company/"))
	if err != nil || strings.TrimSpace(companyName) == "" {
		writeError(w, http.StatusBadRequest, "invalid company name")
		return
	}

	vacancies, err := h.vacancies.ListByCompany(r.Context(), companyName)
	if err != nil {
		h.logger.Error("failed to list vacancies by company", "company", companyName, "error", err)
		writeError(w, http.StatusInternalServerError, "could not fetch vacancies")
		return
	}

	writeJSON(w, http.StatusOK, vacancies)
}

func (h *VacancyHandler) ListBySalary(w http.ResponseWriter, r *http.Request) {
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

	vacancies, err := h.vacancies.ListBySalaryRange(r.Context(), minSalary, maxSalary)
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

	return nil
}

// func decodeBatch(r *http.Request) ([]domain.VacancyInput, error) {
// 	var raw json.RawMessage
// 	if err := decodeJSON(r, &raw); err != nil {
// 		return nil, err
// 	}

// 	// Support both formats:
// 	// 1. [{...}, {...}]
// 	// 2. {"vacancies": [{...}, {...}]}
// 	var inputs []domain.VacancyInput
// 	if err := json.Unmarshal(raw, &inputs); err == nil {
// 		return inputs, nil
// 	}

// 	var wrapped domain.BatchVacancyInput
// 	if err := json.Unmarshal(raw, &wrapped); err != nil {
// 		return nil, err
// 	}
// 	return wrapped.Vacancies, nil
// }

func decodeBatchDTO(r *http.Request) ([]domain.CreateVacancyRequest, error) {
	var raw json.RawMessage
	if err := decodeJSON(r, &raw); err != nil {
		return nil, err
	}

	var inputs []domain.CreateVacancyRequest
	if err := json.Unmarshal(raw, &inputs); err == nil {
		return inputs, nil
	}

	var wrapped struct {
		Vacancies []domain.CreateVacancyRequest `json:"vacancies"`
	}
	if err := json.Unmarshal(raw, &wrapped); err != nil {
		return nil, err
	}
	return wrapped.Vacancies, nil
}

func validateVacancyInput(input domain.VacancyInput) error {
	return input.Validate()
}

func queryInt(r *http.Request, key string, fallback int) int {
	value, err := strconv.Atoi(r.URL.Query().Get(key))
	if err != nil {
		return fallback
	}
	return value
}

func queryFloat(r *http.Request, key string) (float64, error) {
	return strconv.ParseFloat(r.URL.Query().Get(key), 64)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	// All handlers return JSON, including errors. This makes the API predictable
	// for parser_service and future frontend clients.
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, `{"error":"failed to encode response"}`, http.StatusInternalServerError)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
