import { describe, expect, it } from 'vitest';
import { buildPolity, parseEntry } from '../pipeline/import-leaders.ts';

describe('parseEntry', () => {
  it('picks the period that covers 2010', () => {
    const e = parseEntry('Hüseyin Özgürgün, acting Prime minister (2010), Prime minister (2016–2018)');
    expect(e).toMatchObject({ name: 'Hüseyin Özgürgün', title: 'acting Prime minister', from: 2010, to: 2010 });
  });
  it('treats "present" as open-ended', () => {
    expect(parseEntry('Paul Biya, President (1982–present)')).toMatchObject({ from: 1982, to: null });
  });
  it('rejects rows outside 2010 or without a title', () => {
    expect(parseEntry('A B, King (1900–1950)')).toBeNull();
    expect(parseEntry('Nameless (2000–2020)')).toBeNull();
  });
});

describe('buildPolity', () => {
  it('uses the first ruler-like title as ruler and the rest as offices', () => {
    const p = buildPolity('Testland', 'Q1', ['X Y, High Representative (2009–2021)', 'A B, Chairman (2009–2012)', 'C D, Prime minister (2008–2012)'], null);
    expect(p.rulers.map((r) => r.name)).toEqual(['A B']);
    expect(p.offices.map((o) => o.name)).toEqual(['X Y', 'C D']);
    expect(p.review).toBeUndefined();
  });
  it('keeps curated rulers and does not duplicate them as offices', () => {
    const existing = buildPolity('Testland', 'Q1', ['A B, President (2000–2020)'], null);
    const merged = buildPolity('Testland', 'Q1', ['A B, President (2000–2020)', 'C D, Prime minister (2008–2012)'], existing);
    expect(merged.rulers).toEqual(existing.rulers);
    expect(merged.offices.map((o) => o.name)).toEqual(['C D']);
  });
});
