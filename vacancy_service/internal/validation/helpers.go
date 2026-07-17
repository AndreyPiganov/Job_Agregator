package validation

import (
	"encoding/json"
	"net/http"
)

func BindAndValidate(r *http.Request, dst any) error {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		return err
	}
	return Validate.Struct(dst)
}
