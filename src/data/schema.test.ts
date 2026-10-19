import { describe, expect, it } from 'vitest';
import { Polity, isIndexable } from './schema';

const citation = { url: 'https://example.org/source', quote: 'a quoted supporting passage' };
const valid = {
  qid: 'Q142',
  name: 'Kingdom of France',
  summary: 'A fixture polity used only by tests.',
  rulers: [{ name: 'Test Ruler', title: 'king', from: 1483, to: 1498, source: citation }],
  events: [],
};

describe('Polity schema', () => {
  it('accepts a sourced polity', () => {
    expect(Polity.safeParse(valid).success).toBe(true);
  });

  it('rejects a ruler without a source', () => {
    const bad = { ...valid, rulers: [{ ...valid.rulers[0], source: undefined }] };
    expect(Polity.safeParse(bad).success).toBe(false);
  });

  it('rejects a ruling period that ends before it starts', () => {
    const bad = { ...valid, rulers: [{ ...valid.rulers[0], from: 1500, to: 1490 }] };
    expect(Polity.safeParse(bad).success).toBe(false);
  });

  it('rejects army size without a confidence level', () => {
    const bad = { ...valid, armySize: { value: 1000, year: 1492, source: citation } };
    expect(Polity.safeParse(bad).success).toBe(false);
  });

  it('rejects a malformed QID', () => {
    expect(Polity.safeParse({ ...valid, qid: '142' }).success).toBe(false);
  });

  it('keeps unreviewed polities out of the index', () => {
    const parsed = Polity.parse(valid);
    expect(isIndexable(parsed)).toBe(false);
    const reviewed = Polity.parse({ ...valid, review: { by: 'nsijwali', date: '2026-10-19', contentHash: 'a'.repeat(64) } });
    expect(isIndexable(reviewed)).toBe(true);
  });
});
