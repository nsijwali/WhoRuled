import { describe, expect, it } from 'vitest';
import { correctionUrl, formatYear, inYear } from './format';

describe('formatYear', () => {
  it('labels negative years as BC', () => {
    expect(formatYear(-500)).toBe('500 BC');
  });
  it('leaves positive years as-is', () => {
    expect(formatYear(1492)).toBe('1492');
  });
});

describe('correctionUrl', () => {
  it('pre-fills the state and year in a GitHub issue', () => {
    const url = new URL(correctionUrl('Ottoman Empire', -500));
    expect(url.origin + url.pathname).toBe('https://github.com/nsijwali/WhoRuled/issues/new');
    expect(url.searchParams.get('title')).toBe('Correction: Ottoman Empire, 500 BC');
    expect(url.searchParams.get('body')).toContain('Year: 500 BC');
  });
  it('works without a year or a name', () => {
    expect(new URL(correctionUrl(null, null)).searchParams.get('title')).toBe('Correction: an unnamed territory');
    expect(new URL(correctionUrl('France', null)).searchParams.get('body')).not.toContain('Year:');
  });
  it('keeps odd characters in a name from breaking the link', () => {
    const url = new URL(correctionUrl('A&B #1', 1900));
    expect(url.searchParams.get('title')).toBe('Correction: A&B #1, 1900');
  });
});

describe('inYear', () => {
  it('covers both ends and treats a null end as still going', () => {
    expect(inYear({ from: 1000, to: 1100 }, 1000)).toBe(true);
    expect(inYear({ from: 1000, to: 1100 }, 1100)).toBe(true);
    expect(inYear({ from: 1000, to: 1100 }, 1101)).toBe(false);
    expect(inYear({ from: 1000, to: null }, 2026)).toBe(true);
    expect(inYear({ from: 1000, to: null }, 999)).toBe(false);
  });
});
