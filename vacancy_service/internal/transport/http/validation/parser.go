package validation

import (
	"errors"
	"fmt"

	"github.com/go-playground/validator/v10"
)

func Parse(err error) []FieldError {
	var validationErrors validator.ValidationErrors

	if !errors.As(err, &validationErrors) {
		return nil
	}

	result := make([]FieldError, 0, len(validationErrors))

	for _, fe := range validationErrors {
		result = append(result, FieldError{
			Field:   fe.Field(),
			Code:    fe.Tag(),
			Message: messageFor(fe),
		})
	}

	return result
}

func messageFor(fe validator.FieldError) string {
	field := fe.Field()

	switch fe.ActualTag() {

	case "required", "notblank":
		return fmt.Sprintf("%s is required", field)
	case "email":
		return fmt.Sprintf("%s must be a valid email", field)
	case "gte":
		return fmt.Sprintf("%s must be greater than or equal to %s", field, fe.Param())
	case "lte":
		return fmt.Sprintf("%s must be less than or equal to %s", field, fe.Param())
	case "min":
		return fmt.Sprintf("%s must be at least %s", field, fe.Param())
	case "max":
		return fmt.Sprintf("%s must be at most %s", field, fe.Param())
	case "gtefield":
		return fmt.Sprintf("%s must be greater than or equal to %s", field, fe.Param())
	default:
		if fe.Param() != "" {
			return fmt.Sprintf("%s is invalid (%s=%s)", field, fe.Tag(), fe.Param())
		}
		return fmt.Sprintf("%s is invalid", field)
	}
}
