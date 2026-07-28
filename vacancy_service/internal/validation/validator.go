package validation

import (
	"errors"
	"fmt"
	"reflect"
	"strings"
	"sync"

	"github.com/go-playground/validator/v10"
)

var Validate *validator.Validate

var initOnce sync.Once

func Init() {
	initOnce.Do(func() {
		Validate = validator.New()
		_ = Validate.RegisterValidation("notblank", func(fl validator.FieldLevel) bool {
			return strings.TrimSpace(fl.Field().String()) != ""
		})
		Validate.RegisterTagNameFunc(func(field reflect.StructField) string {
			name := strings.Split(field.Tag.Get("json"), ",")[0]
			if name == "-" {
				return ""
			}
			return name
		})
	})
}

// Struct validates a DTO using the tags registered in this package.
func Struct(value any) error {
	Init()
	return Validate.Struct(value)
}

// Message turns validator's technical error into a safe API error message.
func Message(err error) string {
	var validationErrors validator.ValidationErrors
	if !errors.As(err, &validationErrors) || len(validationErrors) == 0 {
		return "invalid request"
	}

	field := validationErrors[0].Field()
	switch validationErrors[0].Tag() {
	case "required", "notblank":
		return fmt.Sprintf("%s is required", field)
	case "gte":
		return fmt.Sprintf("%s must be greater than or equal to %s", field, validationErrors[0].Param())
	default:
		return fmt.Sprintf("%s is invalid", field)
	}
}
