export type UserErrorKind =
  'invalid_argument' | 'not_found' | 'already_exists' | 'failed_precondition' | 'permission_denied' | 'unavailable';

export class UserApplicationError extends Error {
  constructor(
    readonly kind: UserErrorKind,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = UserApplicationError.name;
  }

  static invalidArgument(message: string): UserApplicationError {
    return new UserApplicationError('invalid_argument', message);
  }

  static notFound(resource: string): UserApplicationError {
    return new UserApplicationError('not_found', `${resource} was not found`);
  }

  static alreadyExists(resource: string): UserApplicationError {
    return new UserApplicationError('already_exists', `${resource} already exists`);
  }

  static failedPrecondition(message: string): UserApplicationError {
    return new UserApplicationError('failed_precondition', message);
  }

  static unavailable(cause?: unknown): UserApplicationError {
    return new UserApplicationError('unavailable', 'user service dependency is unavailable', { cause });
  }
}
