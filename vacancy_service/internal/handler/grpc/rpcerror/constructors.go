package rpcerror

import (
	"fmt"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const internalMessage = "internal server error"

func NotFound(message string) error {
	return status.Error(codes.NotFound, message)
}

func NotFoundf(format string, args ...any) error {
	return NotFound(fmt.Sprintf(format, args...))
}

func Internal() error {
	return status.Error(codes.Internal, internalMessage)
}
