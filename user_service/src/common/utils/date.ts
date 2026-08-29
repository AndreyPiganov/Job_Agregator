import { UserApplicationError } from '../errors/user-application.error';
import type { Timestamp } from '../proto/timestamp';

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseOptionalDate(value: string | undefined, field: string): Date | null {
  if (value === undefined || value.trim() === '') {
    return null;
  }
  return parseDate(value, field);
}

export function parseRequiredDate(value: string, field: string): Date {
  if (!value.trim()) {
    throw UserApplicationError.invalidArgument(`${field} is required`);
  }
  return parseDate(value, field);
}

export function formatDateOnly(value: Date | null): string | undefined {
  return value?.toISOString().slice(0, 10);
}

export function timestampFromDate(value: Date): Timestamp {
  const milliseconds = value.getTime();
  return {
    seconds: String(Math.floor(milliseconds / 1000)),
    nanos: (milliseconds % 1000) * 1_000_000,
  };
}

export function timestampFromOptionalDate(value: Date | null): Timestamp | undefined {
  return value ? timestampFromDate(value) : undefined;
}

function parseDate(value: string, field: string): Date {
  const normalized = value.trim();
  if (!dateOnlyPattern.test(normalized)) {
    throw UserApplicationError.invalidArgument(`${field} must use YYYY-MM-DD format`);
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    throw UserApplicationError.invalidArgument(`${field} must be a real calendar date`);
  }
  return date;
}
