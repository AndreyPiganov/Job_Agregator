import { UserApplicationError } from '../errors/user-application.error';
import {
  formatDateOnly,
  parseOptionalDate,
  parseRequiredDate,
  timestampFromDate,
  timestampFromOptionalDate,
} from './date';

describe('date utilities', () => {
  it('parses and formats a real calendar date without a timezone shift', () => {
    const date = parseRequiredDate('2024-02-29', 'started_at');

    expect(date.toISOString()).toBe('2024-02-29T00:00:00.000Z');
    expect(formatDateOnly(date)).toBe('2024-02-29');
  });

  it('maps an absent optional date to null', () => {
    expect(parseOptionalDate(undefined, 'ended_at')).toBeNull();
    expect(parseOptionalDate('  ', 'ended_at')).toBeNull();
  });

  it('rejects an impossible calendar date', () => {
    expect(() => parseRequiredDate('2024-02-30', 'started_at')).toThrow(UserApplicationError);
  });

  it('creates a protobuf timestamp', () => {
    expect(timestampFromDate(new Date('1970-01-01T00:00:01.250Z'))).toEqual({
      seconds: '1',
      nanos: 250_000_000,
    });
  });

  it('keeps an absent optional protobuf timestamp undefined', () => {
    expect(timestampFromOptionalDate(null)).toBeUndefined();
  });
});
