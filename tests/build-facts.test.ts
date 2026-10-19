import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readFacts, writeFacts } from '../pipeline/build-facts.ts';

const citation = { url: 'https://example.org/source', quote: 'a quoted supporting passage' };
const polity = (qid: string) => ({
  qid,
  name: 'Test polity',
  summary: 'Fixture.',
  rulers: [{ name: 'R', title: 'king', from: 1400, to: 1410, source: citation }],
  events: [],
});

function dir(files: Record<string, unknown>): string {
  const d = mkdtempSync(join(tmpdir(), 'facts-'));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(d, name), JSON.stringify(body));
  return d;
}

describe('facts pipeline', () => {
  it('reads valid polities and writes per-QID files plus an index', () => {
    const src = dir({ 'Q1.json': polity('Q1'), 'feature-map.json': { '1492': { Foo: 'Q1' } } });
    const out = mkdtempSync(join(tmpdir(), 'out-'));
    writeFacts(readFacts(src), out);
    expect(JSON.parse(readFileSync(join(out, 'index.json'), 'utf8'))).toEqual({ '1492': { Foo: 'Q1' } });
    expect(JSON.parse(readFileSync(join(out, 'Q1.json'), 'utf8')).qid).toBe('Q1');
  });

  it('rejects a polity without a source', () => {
    const bad = { ...polity('Q1'), rulers: [{ name: 'R', title: 'king', from: 1, to: 2 }] };
    expect(() => readFacts(dir({ 'Q1.json': bad, 'feature-map.json': {} }))).toThrow(/Q1\.json/);
  });

  it('rejects a file name that does not match the qid', () => {
    expect(() => readFacts(dir({ 'Q2.json': polity('Q1'), 'feature-map.json': {} }))).toThrow(/must match qid/);
  });

  it('rejects a map entry pointing at a missing polity', () => {
    expect(() => readFacts(dir({ 'feature-map.json': { '1492': { Foo: 'Q9' } } }))).toThrow(/no facts file/);
  });
});
