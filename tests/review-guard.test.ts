import { describe, expect, it } from 'vitest';
import { guardReasons, isFactsFile, isProtectedPath, reviewChanged, unsignedCommits } from '../pipeline/review-guard.ts';

const review = { by: 'owner', date: '2026-10-20', contentHash: 'a'.repeat(64) };

describe('review guard', () => {
  it('detects added, changed and removed review records, and ignores other edits', () => {
    expect(reviewChanged({ name: 'x' }, { name: 'x', review })).toBe(true);
    expect(reviewChanged({ review }, { review: { ...review, date: '2026-10-21' } })).toBe(true);
    expect(reviewChanged({ review }, { name: 'x' })).toBe(true);
    expect(reviewChanged({ name: 'x' }, { name: 'y', rulers: [] })).toBe(false);
    expect(reviewChanged(null, { name: 'new polity' })).toBe(false);
    expect(reviewChanged({ review }, { review })).toBe(false);
  });

  it('knows which files are facts and which paths are protected', () => {
    expect(isFactsFile('data/facts/Q12560.json')).toBe(true);
    expect(isFactsFile('data/facts/feature-map.json')).toBe(false);
    for (const p of ['.github/workflows/ci.yml', '.github/CODEOWNERS', 'CLAUDE.md', '.claude/skills/x/SKILL.md', 'src/data/schema.ts'])
      expect(isProtectedPath(p), p).toBe(true);
    for (const p of ['src/components/MapIsland.tsx', 'data/facts/Q1.json', 'docs/DEPLOY.md']) expect(isProtectedPath(p), p).toBe(false);
  });

  it('asks for signatures only when something guarded changed', () => {
    expect(guardReasons([{ filename: 'data/facts/Q1.json', status: 'modified' }], [])).toEqual([]);
    expect(guardReasons([{ filename: 'data/facts/Q1.json', status: 'modified' }], ['data/facts/Q1.json'])).toHaveLength(1);
    expect(guardReasons([{ filename: '.github/CODEOWNERS', status: 'modified' }], [])).toHaveLength(1);
  });

  it('lists the commits that are not verified', () => {
    const bad = unsignedCommits([
      { sha: 'a', verified: true },
      { sha: 'b', verified: false },
    ]);
    expect(bad.map((c) => c.sha)).toEqual(['b']);
  });
});
