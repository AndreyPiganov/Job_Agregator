import { HttpStatus } from '@nestjs/common';
import { UpstreamServiceError } from './upstream-service.error';
import { upstreamErrorToHttp } from './upstream-error.filter';

describe('upstreamErrorToHttp', () => {
  it.each([
    ['invalid_argument', HttpStatus.BAD_REQUEST],
    ['not_found', HttpStatus.NOT_FOUND],
    ['already_exists', HttpStatus.CONFLICT],
    ['permission_denied', HttpStatus.FORBIDDEN],
    ['unauthenticated', HttpStatus.UNAUTHORIZED],
    ['resource_exhausted', HttpStatus.TOO_MANY_REQUESTS],
    ['failed_precondition', HttpStatus.UNPROCESSABLE_ENTITY],
    ['unavailable', HttpStatus.SERVICE_UNAVAILABLE],
    ['deadline_exceeded', HttpStatus.GATEWAY_TIMEOUT],
    ['invalid_response', HttpStatus.BAD_GATEWAY],
    ['unknown', HttpStatus.BAD_GATEWAY],
  ] as const)('maps %s to HTTP %s', (kind, expectedStatus) => {
    const error = new UpstreamServiceError('vacancy service', kind, 'request failed');

    expect(upstreamErrorToHttp(error).getStatus()).toBe(expectedStatus);
  });
});
