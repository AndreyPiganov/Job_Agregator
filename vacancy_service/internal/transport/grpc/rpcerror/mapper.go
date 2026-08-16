package rpcerror

import (
	"context"
	"errors"

	"vacancy_service/internal/domain"

	"google.golang.org/grpc/status"
)

// FromService converts application and context errors to safe public gRPC
// statuses. Unknown errors are deliberately hidden from the client.
func FromService(err error) error {
	switch {
	case err == nil:
		return nil
	case errors.Is(err, context.Canceled), errors.Is(err, context.DeadlineExceeded):
		return status.FromContextError(err).Err()
	case errors.Is(err, domain.ErrVacancyNotFound):
		return NotFound("vacancy not found")
	}

	if grpcStatus, ok := status.FromError(err); ok {
		return grpcStatus.Err()
	}
	return Internal()
}
