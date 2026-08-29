export function canonicalizeText(value: string): string {
  return value.trim();
}

export function canonicalizeOptionalText(value: string | undefined): string | null {
  if (value === undefined) return null;
  return canonicalizeText(value) || null;
}
