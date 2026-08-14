package validation

import (
	"reflect"
	"strings"

	playground "github.com/go-playground/validator/v10"
)

type Validator struct {
	validator *playground.Validate
}

func New() (*Validator, error) {
	validate := playground.New()
	if err := validate.RegisterValidation("notblank", func(fl playground.FieldLevel) bool {
		return strings.TrimSpace(fl.Field().String()) != ""
	}); err != nil {
		return nil, err
	}

	validate.RegisterTagNameFunc(func(field reflect.StructField) string {
		name := strings.Split(field.Tag.Get("json"), ",")[0]
		if name == "-" {
			return ""
		}
		return name
	})

	return &Validator{validator: validate}, nil
}

func (v *Validator) Struct(value any) error {
	return v.validator.Struct(value)
}
