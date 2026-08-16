package grpcserver

import (
	"context"
	"fmt"
	"log/slog"
	"runtime/debug"
	"time"

	"vacancy_service/internal/transport/grpc/rpcerror"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func UnaryServerInterceptor(logger *slog.Logger) grpc.UnaryServerInterceptor {
	return func(
		ctx context.Context,
		request any,
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (response any, err error) {
		startedAt := time.Now()

		defer func() {
			if recovered := recover(); recovered != nil {
				logger.ErrorContext(
					ctx,
					"panic while handling gRPC request",
					"method", info.FullMethod,
					"panic", fmt.Sprint(recovered),
					"stack", string(debug.Stack()),
				)
				err = rpcerror.Internal()
			}

			code := status.Code(err)
			level := grpcLogLevel(code)
			logger.Log(
				ctx,
				level,
				"gRPC request completed",
				"method", info.FullMethod,
				"code", code.String(),
				"duration_ms", time.Since(startedAt).Milliseconds(),
			)
		}()

		return handler(ctx, request)
	}
}

func grpcLogLevel(code codes.Code) slog.Level {
	switch code {
	case codes.OK:
		return slog.LevelDebug
	case codes.InvalidArgument,
		codes.NotFound,
		codes.AlreadyExists,
		codes.PermissionDenied,
		codes.Unauthenticated,
		codes.ResourceExhausted,
		codes.FailedPrecondition,
		codes.OutOfRange,
		codes.Canceled,
		codes.DeadlineExceeded:
		return slog.LevelWarn
	default:
		return slog.LevelError
	}
}
