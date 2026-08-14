package apperror

import "vacancy_service/internal/transport/http/validation"

type Error struct {
	Status  int                     `json:"-"`
	Code    string                  `json:"code"`
	Message string                  `json:"message"`
	Errors  []validation.FieldError `json:"errors,omitempty"`
}

func (e *Error) Error() string {
	return e.Message
}
