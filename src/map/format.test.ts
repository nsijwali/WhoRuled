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

  // Year-only dates are inclusive, so these cases pin the current behaviour: a year matches
  // any ruler who held office at any point in it. Changing that rule needs a schema decision.
  it('matches a ruler who starts and ends in the same year, and no other year', () => {
    expect(inYear({ from: 1500, to: 1500 }, 1500)).toBe(true);
    expect(inYear({ from: 1500, to: 1500 }, 1499)).toBe(false);
    expect(inYear({ from: 1500, to: 1500 }, 1501)).toBe(false);
  });

  it('matches both rulers when two periods overlap', () => {
    const a = { from: 1480, to: 1510 };
    const b = { from: 1500, to: 1520 };
    expect(inYear(a, 1505) && inYear(b, 1505)).toBe(true);
    expect(inYear(a, 1499) && inYear(b, 1499)).toBe(false);
  });

  it('matches both rulers in a handover year, and one ruler either side of it', () => {
    const outgoing = { from: 1490, to: 1500 };
    const incoming = { from: 1500, to: 1510 };
    expect(inYear(outgoing, 1500) && inYear(incoming, 1500)).toBe(true);
    expect(inYear(outgoing, 1499) && inYear(incoming, 1499)).toBe(false);
    expect(inYear(outgoing, 1501) && inYear(incoming, 1501)).toBe(false);
  });
});
