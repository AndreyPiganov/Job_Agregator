import { canonicalizeOptionalText, canonicalizeText } from './text';

describe('text utilities', () => {
  it('trims required text and keeps its string type', () => {
    expect(canonicalizeText('  Backend developer  ')).toBe('Backend developer');
    expect(canonicalizeText('   ')).toBe('');
  });

  it('maps absent or blank optional text to null', () => {
    expect(canonicalizeOptionalText(undefined)).toBeNull();
    expect(canonicalizeOptionalText('   ')).toBeNull();
  });

  it('trims present optional text', () => {
    expect(canonicalizeOptionalText('  Moscow  ')).toBe('Moscow');
  });
});
