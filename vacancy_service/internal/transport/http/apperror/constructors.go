package apperror

import (
	"net/http"

	"vacancy_service/internal/transport/http/validation"
)

func Validation(errors []validation.FieldError) error {
	return &Error{
		Status:  http.StatusBadRequest,
		Code:    "validation_failed",
		Message: "Validation failed",
		Errors:  errors,
	}
}

func BadRequest(message string) error {
	return &Error{
		Status:  http.StatusBadRequest,
		Code:    "bad_request",
		Message: message,
	}
}

func NotFound(message string) error {
	return &Error{
		Status:  http.StatusNotFound,
		Code:    "not_found",
		Message: message,
	}
}

func MethodNotAllowed(message string) error {
	return &Error{
		Status:  http.StatusMethodNotAllowed,
		Code:    "method_not_allowed",
		Message: message,
	}
}

func PayloadTooLarge(message string) error {
	return &Error{
		Status:  http.StatusRequestEntityTooLarge,
		Code:    "payload_too_large",
		Message: message,
	}
}

func Conflict(message string) error {
	return &Error{
		Status:  http.StatusConflict,
		Code:    "conflict",
		Message: message,
	}
}

func Internal() error {
	return &Error{
		Status:  http.StatusInternalServerError,
		Code:    "internal_error",
		Message: "Internal server error",
	}
}
