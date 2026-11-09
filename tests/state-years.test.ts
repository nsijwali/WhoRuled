import { describe, expect, it } from 'vitest';
import { isThinStateYear, stateYears } from '../src/data/stateYears.ts';
import { inYear } from '../src/map/format.ts';
const source = { url: 'https://en.wikipedia.org/wiki/Example', quote: 'Example' };
const ruler = { name: 'R', title: 'King', from: 1000, to: 1100, source };
const near = { year: 1050, summary: 'Nearby', source };
const far = { year: 1500, summary: 'Far', source };

describe('isThinStateYear', () => {
  it('is thin when one ruler, no office holders and no event within the window', () => {
    expect(isThinStateYear({ events: [far] }, 1050, [ruler], [])).toBe(true);
  });

  it('is not thin when an event falls within the window', () => {
    expect(isThinStateYear({ events: [near] }, 1050, [ruler], [])).toBe(false);
  });

  it('is not thin with two or more rulers or any office holder', () => {
    expect(isThinStateYear({ events: [] }, 1050, [ruler, ruler], [])).toBe(false);
    expect(isThinStateYear({ events: [] }, 1050, [ruler], [ruler])).toBe(false);
  });
});

describe('stateYears', () => {
  const entries = stateYears();

  it('marks thin state-years as not indexable, so the sitemap omits them', () => {
    for (const { polity, year, rulers, offices, indexable } of entries) {
      if (indexable) {
        expect(isThinStateYear(polity, year, rulers, offices), `${polity.qid} ${year}`).toBe(false);
      }
    }
  });

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
