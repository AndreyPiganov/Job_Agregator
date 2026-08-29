package rpcerror

import (
	"context"
	"errors"
	"testing"

	"vacancy_service/internal/domain"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestConstructors(t *testing.T) {
	tests := []struct {
		name    string
		err     error
		code    codes.Code
		message string
	}{
		{
			name:    "not found",
			err:     NotFoundf("vacancy with id %d not found", 42),
			code:    codes.NotFound,
			message: "vacancy with id 42 not found",
		},
		{
			name:    "internal",
			err:     Internal(),
			code:    codes.Internal,
			message: internalMessage,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if status.Code(test.err) != test.code {
				t.Fatalf("expected code %s, got %s", test.code, status.Code(test.err))
			}
			if status.Convert(test.err).Message() != test.message {
				t.Fatalf("unexpected message: %q", status.Convert(test.err).Message())
			}
		})
	}
}

func TestFromService(t *testing.T) {
	tests := []struct {
		name    string
		err     error
		code    codes.Code
		message string
	}{
		{name: "nil", err: nil, code: codes.OK},
		{name: "not found", err: domain.ErrVacancyNotFound, code: codes.NotFound, message: "vacancy not found"},
		{name: "canceled", err: context.Canceled, code: codes.Canceled, message: context.Canceled.Error()},
		{name: "deadline", err: context.DeadlineExceeded, code: codes.DeadlineExceeded, message: context.DeadlineExceeded.Error()},
		{name: "existing status", err: status.Error(codes.AlreadyExists, "vacancy already exists"), code: codes.AlreadyExists, message: "vacancy already exists"},
		{name: "unknown", err: errors.New("database password must not leak"), code: codes.Internal, message: internalMessage},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := FromService(test.err)
			if status.Code(err) != test.code {
				t.Fatalf("expected code %s, got %s: %v", test.code, status.Code(err), err)
			}
			if err != nil && status.Convert(err).Message() != test.message {
				t.Fatalf("unexpected message: %q", status.Convert(err).Message())
			}
		})
	}
}
