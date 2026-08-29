export type AuthErrorKind =
  | 'invalid_argument'
  | 'invalid_credentials'
  | 'identifier_already_exists'
  | 'invalid_token'
  | 'session_not_found'
  | 'permission_denied'
  | 'resource_exhausted'
  | 'unavailable'
  | 'not_implemented';

export class AuthApplicationError extends Error {
  constructor(
    readonly kind: AuthErrorKind,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = AuthApplicationError.name;
  }

  static notImplemented(operation: string): AuthApplicationError {
    return new AuthApplicationError('not_implemented', `${operation} is not implemented yet`);
  }

  static invalidArgument(message: string): AuthApplicationError {
    return new AuthApplicationError('invalid_argument', message);
  }

  static invalidCredentials(): AuthApplicationError {
    return new AuthApplicationError('invalid_credentials', 'identifier or password is incorrect');
  }

  static identifierAlreadyExists(): AuthApplicationError {
    return new AuthApplicationError(
      'identifier_already_exists',
      'an account with this email or phone number already exists',
    );
  }

  static invalidToken(): AuthApplicationError {
    return new AuthApplicationError('invalid_token', 'token is invalid or expired');
  }

  static unavailable(cause?: unknown): AuthApplicationError {
    return new AuthApplicationError('unavailable', 'authentication dependency is unavailable', { cause });
  }
}
