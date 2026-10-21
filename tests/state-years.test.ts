import { describe, expect, it } from 'vitest';
import { stateYears } from '../src/data/stateYears.ts';
import { inYear } from '../src/map/format.ts';

describe('stateYears', () => {
  const entries = stateYears();

  it('only lists state-years with a sourced ruler in office', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const { polity, year, rulers } of entries) {
      expect(rulers.length, `${polity.qid} ${year}`).toBeGreaterThan(0);
      for (const r of rulers) {
        expect(inYear(r, year)).toBe(true);
        expect(r.source.url).toMatch(/^https:\/\//);
      }
    }
  });

  it('has one entry per state and year', () => {
    const keys = entries.map((e) => `${e.polity.qid}/${e.year}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
