package http

import (
	"errors"
	"log/slog"
	"net/http"

	apperror "vacancy_service/internal/error"
)

func Error(w http.ResponseWriter, err error) {
	var appErr *apperror.Error

	if errors.As(err, &appErr) {
		WriteJSON(w, appErr.Status, appErr)
		return
	}

	slog.Error("internal server error", "error", err)

	WriteJSON(w, http.StatusInternalServerError, apperror.Internal())
}
