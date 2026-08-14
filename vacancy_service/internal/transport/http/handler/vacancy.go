package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"strconv"
	"strings"

	domain "vacancy_service/internal/domain"
	service "vacancy_service/internal/service"
	httpx "vacancy_service/internal/transport/http"
	"vacancy_service/internal/transport/http/apperror"
	"vacancy_service/internal/transport/http/handler/dto"
	"vacancy_service/internal/transport/http/validation"

	"github.com/go-chi/chi/v5"
)

const maxRequestBodyBytes = 10 << 20

type Service interface {
	List(ctx context.Context, p domain.Pagination) ([]domain.Vacancy, error)
	GetByID(ctx context.Context, id int64) (domain.Vacancy, error)
	Create(ctx context.Context, input service.CreateVacancyInput) (domain.Vacancy, error)
	CreateBatch(ctx context.Context, inputs []service.CreateVacancyInput) ([]domain.Vacancy, error)
	ListByFilterParams(ctx context.Context, filter domain.VacancyFilter) ([]domain.Vacancy, error)
}

type handler struct {
	service   Service
	logger    *slog.Logger
	validator *validation.Validator
}

func NewHandler(service Service, logger *slog.Logger, validator *validation.Validator) *handler {
	return &handler{
		service:   service,
		logger:    logger,
		validator: validator,
	}
}

func (h *handler) Health(w http.ResponseWriter, _ *http.Request) {
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *handler) List(w http.ResponseWriter, r *http.Request) {
	// Query params arrive as strings. Helpers parse them and provide defaults.
	page, err := queryInt(r, "page", 1)
	if err != nil || page < 1 {
		httpx.Error(w, apperror.BadRequest("page must be a positive integer"))
		return
	}
	limit, err := queryInt(r, "itemsPerPage", 10)
	if err != nil || limit < 1 {
		httpx.Error(w, apperror.BadRequest("itemsPerPage must be a positive integer"))
		return
	}

	p := domain.Pagination{
		Page:         page,
		ItemsPerPage: limit,
	}

	p.Normalize()

	vacancies, err := h.service.List(r.Context(), p)
	if err != nil {
		h.logger.ErrorContext(r.Context(), "failed to list vacancies", "request_id", httpx.RequestID(r.Context()), "error", err)
		httpx.Error(w, apperror.Internal())
		return
	}

	httpx.WriteJSON(w, http.StatusOK, vacancies)
}

func (h *handler) GetByID(w http.ResponseWriter, r *http.Request) {

	idText := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idText, 10, 64)
	if err != nil || id < 1 {
		httpx.Error(w, apperror.BadRequest("invalid vacancy id"))
		return
	}

	vacancy, err := h.service.GetByID(r.Context(), id)
	if errors.Is(err, domain.ErrVacancyNotFound) {
		httpx.Error(w, apperror.NotFound(fmt.Sprintf("vacancy with id %d not found", id)))
		return
	}
	if err != nil {
		h.logger.ErrorContext(r.Context(), "failed to get vacancy", "request_id", httpx.RequestID(r.Context()), "id", id, "error", err)
		httpx.Error(w, apperror.Internal())
		return
	}

	httpx.WriteJSON(w, http.StatusOK, vacancy)
}

func (h *handler) Create(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)
	var dtoReq dto.CreateVacancyRequest
	// decode into DTO so we can validate tags using go-playground/validator
	if err := decodeJSON(r, &dtoReq); err != nil {
		writeDecodeError(w, err)
		return
	}
	if err := h.validator.Struct(dtoReq); err != nil {
		httpx.Error(
			w,
			apperror.Validation(validation.Parse(err)))
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
		h.logger.ErrorContext(r.Context(), "failed to create vacancy", "request_id", httpx.RequestID(r.Context()), "error", err)
		httpx.Error(w, apperror.Internal())
		return
	}
	h.logger.InfoContext(
		r.Context(),
		"vacancy created",
		"request_id", httpx.RequestID(r.Context()),
		"vacancy_id", vacancy.ID,
		"company", input.CompanyName,
	)

	httpx.WriteJSON(w, http.StatusCreated, vacancy)
}

func (h *handler) CreateBatch(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)
	// Batch endpoint is meant for parser_service. It accepts many vacancies in
	// one HTTP request, then repository writes them in one transaction.
	// decode into DTOs first so we can validate tags
	dtoInputs, err := decodeBatchDTO(r)
	if err != nil {
		writeDecodeError(w, err)
		return
	}
	if len(dtoInputs) == 0 {
		httpx.Error(w, apperror.BadRequest("vacancies must not be empty"))
		return
	}
	if len(dtoInputs) > 1000 {
		httpx.Error(w, apperror.BadRequest("batch size must not exceed 1000 vacancies"))
		return
	}
	inputs := make([]service.CreateVacancyInput, 0, len(dtoInputs))
	for _, d := range dtoInputs {
		if err := h.validator.Struct(d); err != nil {
			httpx.Error(
				w,
				apperror.Validation(validation.Parse(err)))
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
		h.logger.ErrorContext(r.Context(), "failed to create vacancy batch", "request_id", httpx.RequestID(r.Context()), "count", len(inputs), "error", err)
		httpx.Error(w, apperror.Internal())
		return
	}
	h.logger.InfoContext(
		r.Context(),
		"vacancy batch created",
		"request_id", httpx.RequestID(r.Context()),
		"count", len(vacancies),
	)

	httpx.WriteJSON(w, http.StatusCreated, vacancies)
}

func (h *handler) ListByFilterParams(w http.ResponseWriter, r *http.Request) {
	request, err := parseVacancyFilterRequest(r)
	if err != nil {
		httpx.Error(w, apperror.BadRequest(err.Error()))
		return
	}
	if err := h.validator.Struct(request); err != nil {
		httpx.Error(
			w,
			apperror.Validation(validation.Parse(err)))
		return
	}
	if request.MinSalary != nil && request.MaxSalary != nil && *request.MaxSalary < *request.MinSalary {
		httpx.Error(w, apperror.BadRequest("maxSalary must be greater than or equal to minSalary"))
		return
	}
	if len(request.SearchFields) > 0 && request.Keyword == "" {
		httpx.Error(w, apperror.BadRequest("q is required when search_field is specified"))
		return
	}

	searchFields := make([]domain.VacancySearchField, 0, len(request.SearchFields))
	for _, field := range request.SearchFields {
		searchFields = append(searchFields, domain.VacancySearchField(field))
	}
	if request.Keyword != "" && len(searchFields) == 0 {
		searchFields = []domain.VacancySearchField{
			domain.VacancySearchTitle,
			domain.VacancySearchDescription,
			domain.VacancySearchCompanyName,
		}
	}

	filter := domain.VacancyFilter{
		Keyword:      request.Keyword,
		Cities:       request.Cities,
		SearchFields: searchFields,
		MinSalary:    request.MinSalary,
		MaxSalary:    request.MaxSalary,
		Sort:         domain.VacancySort(request.Sort),
		Period:       domain.VacancyPeriod(request.Period),
		Page:         request.Page,
		ItemsPerPage: request.ItemsPerPage,
	}

	vacancies, err := h.service.ListByFilterParams(r.Context(), filter)
	if err != nil {
		h.logger.ErrorContext(r.Context(), "failed to list vacancies by filter params", "request_id", httpx.RequestID(r.Context()), "error", err)
		httpx.Error(w, apperror.Internal())
		return
	}
	h.logger.DebugContext(
		r.Context(),
		"vacancies filtered",
		"request_id", httpx.RequestID(r.Context()),
		"result_count", len(vacancies),
		"city_count", len(filter.Cities),
		"search_field_count", len(filter.SearchFields),
		"sort", filter.Sort,
		"period", filter.Period,
	)

	httpx.WriteJSON(w, http.StatusOK, vacancies)
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

func writeDecodeError(w http.ResponseWriter, err error) {
	var maxBytesError *http.MaxBytesError
	if errors.As(err, &maxBytesError) {
		httpx.Error(w, apperror.PayloadTooLarge("request body is too large"))
		return
	}
	httpx.Error(w, apperror.BadRequest("invalid JSON request body"))
}

func decodeBatchDTO(r *http.Request) ([]dto.CreateVacancyRequest, error) {
	var raw json.RawMessage
	if err := decodeJSON(r, &raw); err != nil {
		return nil, err
	}

	var inputs []dto.CreateVacancyRequest
	if err := decodeStrictJSON(raw, &inputs); err == nil {
		return inputs, nil
	}

	var wrapped dto.CreateVacancyBatchRequest
	if err := decodeStrictJSON(raw, &wrapped); err != nil {
		return nil, err
	}

	return wrapped.Vacancies, nil
}

func decodeStrictJSON(raw []byte, target any) error {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return errors.New("JSON must contain one value")
	}
	return nil
}

func queryInt(r *http.Request, key string, fallback int) (int, error) {
	raw := r.URL.Query().Get(key)
	if raw == "" {
		return fallback, nil
	}
	return strconv.Atoi(raw)
}

func parseVacancyFilterRequest(r *http.Request) (dto.VacancyFilterRequest, error) {
	page, err := queryInt(r, "page", 1)
	if err != nil {
		return dto.VacancyFilterRequest{}, errors.New("page must be an integer")
	}
	itemsPerPage, err := queryInt(r, "itemsPerPage", 10)
	if err != nil {
		return dto.VacancyFilterRequest{}, errors.New("itemsPerPage must be an integer")
	}
	minSalary, err := queryOptionalFloat(r, "minSalary")
	if err != nil {
		return dto.VacancyFilterRequest{}, errors.New("minSalary must be a number")
	}
	maxSalary, err := queryOptionalFloat(r, "maxSalary")
	if err != nil {
		return dto.VacancyFilterRequest{}, errors.New("maxSalary must be a number")
	}

	return dto.VacancyFilterRequest{
		Keyword:      strings.TrimSpace(r.URL.Query().Get("q")),
		Cities:       queryList(r, "city", false),
		SearchFields: queryList(r, "search_field", true),
		MinSalary:    minSalary,
		MaxSalary:    maxSalary,
		Sort:         strings.ToLower(strings.TrimSpace(r.URL.Query().Get("sort"))),
		Period:       strings.ToLower(strings.TrimSpace(r.URL.Query().Get("period"))),
		Page:         page,
		ItemsPerPage: itemsPerPage,
	}, nil
}

func queryOptionalFloat(r *http.Request, key string) (*float64, error) {
	raw := strings.TrimSpace(r.URL.Query().Get(key))
	if raw == "" {
		return nil, nil
	}
	value, err := strconv.ParseFloat(raw, 64)
	if err != nil || math.IsNaN(value) || math.IsInf(value, 0) {
		return nil, errors.New("invalid number")
	}
	return &value, nil
}

func queryList(r *http.Request, key string, lower bool) []string {
	result := make([]string, 0)
	seen := make(map[string]struct{})
	for _, raw := range r.URL.Query()[key] {
		for _, item := range strings.Split(raw, ",") {
			item = strings.TrimSpace(item)
			if lower {
				item = strings.ToLower(item)
			}
			if _, exists := seen[item]; exists {
				continue
			}
			seen[item] = struct{}{}
			result = append(result, item)
		}
	}
	return result
}
