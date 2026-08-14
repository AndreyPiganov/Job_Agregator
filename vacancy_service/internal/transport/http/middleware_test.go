package http

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
)

func TestRequestIDMiddlewareGeneratesUUID(t *testing.T) {
	var contextRequestID string
	handler := requestIDMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		contextRequestID = RequestID(r.Context())
		w.WriteHeader(http.StatusNoContent)
	}))
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/", nil))

	headerRequestID := response.Header().Get(requestIDHeader)
	if uuid.Validate(headerRequestID) != nil {
		t.Fatalf("expected UUID request ID, got %q", headerRequestID)
	}
	if contextRequestID != headerRequestID {
		t.Fatalf("expected context request ID %q, got %q", headerRequestID, contextRequestID)
	}
}

func TestRequestIDMiddlewareKeepsValidIncomingUUID(t *testing.T) {
	requestID := uuid.NewString()
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.Header.Set(requestIDHeader, requestID)
	response := httptest.NewRecorder()
	handler := requestIDMiddleware(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	handler.ServeHTTP(response, request)

	if got := response.Header().Get(requestIDHeader); got != requestID {
		t.Fatalf("expected request ID %q, got %q", requestID, got)
	}
}
