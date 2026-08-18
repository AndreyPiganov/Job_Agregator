export type UpstreamErrorKind =
  | 'invalid_argument'
  | 'not_found'
  | 'already_exists'
  | 'permission_denied'
  | 'unauthenticated'
  | 'resource_exhausted'
  | 'failed_precondition'
  | 'unavailable'
  | 'deadline_exceeded'
  | 'invalid_response'
  | 'unknown';

export class UpstreamServiceError extends Error {
  constructor(
    public readonly service: string,
    public readonly kind: UpstreamErrorKind,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'UpstreamServiceError';
  }
}
