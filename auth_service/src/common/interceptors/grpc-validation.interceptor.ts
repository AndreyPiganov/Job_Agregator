import { DescMessage, DescService, fromJson, JsonValue, MessageShape } from '@bufbuild/protobuf';
import { createValidator } from '@bufbuild/protovalidate';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { AuthApplicationError } from '../errors/auth-application.error';
import { GRPC_VALIDATION_SERVICE } from '../proto/grpc-validated.decorator';

const validator = createValidator();

@Injectable()
export class GrpcValidationInterceptor implements NestInterceptor<unknown, unknown> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    if (context.getType() !== 'rpc') return next.handle();

    const service = this.reflector.get<DescService>(GRPC_VALIDATION_SERVICE, context.getClass());
    if (!service) return next.handle();

    const handlerName = context.getHandler().name;
    const method = service.methods.find((candidate) => candidate.localName === handlerName);
    if (!method) throw new Error(`${service.typeName}.${handlerName} has no protobuf method descriptor`);
    if (method.methodKind !== 'unary') {
      throw new Error(`${service.typeName}.${method.name} requires stream-aware protobuf validation`);
    }

    validateGrpcRequest(method.input, context.switchToRpc().getData<unknown>());
    return next.handle();
  }
}

export function validateGrpcRequest<Schema extends DescMessage>(schema: Schema, request: unknown): void {
  let message: MessageShape<Schema>;
  try {
    message = fromJson(schema, request as JsonValue);
  } catch (error) {
    throw AuthApplicationError.invalidArgument(errorMessage(error));
  }

  const result = validator.validate(schema, message);
  if (result.kind === 'invalid') throw AuthApplicationError.invalidArgument(result.error.message);
  if (result.kind === 'error') throw result.error;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'request is not a valid protobuf message';
}
