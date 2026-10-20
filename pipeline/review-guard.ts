import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * ADR-019 review guard. A pull request that changes a page's `review` record, or touches the protected paths,
 * may only contain commits that GitHub verifies as signed. The agent holds no signing key, so it cannot pass.
 * This runs from the base branch (`pull_request_target`) and never executes pull-request code.
 */
export const PROTECTED_PREFIXES = ['.github/', '.claude/', 'src/data/'] as const;
export const PROTECTED_FILES = ['CLAUDE.md'] as const;
const FACTS_FILE = /^data\/facts\/Q[1-9]\d*\.json$/;

export interface ChangedFile {
  readonly filename: string;
  readonly status: string;
}

export interface CommitInfo {
  readonly sha: string;
  readonly verified: boolean;
}

export function isProtectedPath(filename: string): boolean {
  return PROTECTED_FILES.includes(filename as (typeof PROTECTED_FILES)[number]) || PROTECTED_PREFIXES.some((p) => filename.startsWith(p));
}

export function isFactsFile(filename: string): boolean {
  return FACTS_FILE.test(filename);
}

/** Compares the `review` field of two parsed polity documents (undefined = no review). */
export function reviewChanged(base: unknown, head: unknown): boolean {
  const pick = (doc: unknown): string => JSON.stringify((doc as { review?: unknown } | null)?.review ?? null);
  return pick(base) !== pick(head);
}

/** The reasons this pull request needs signed commits; empty means it needs none. */
export function guardReasons(files: readonly ChangedFile[], reviewChangedFiles: readonly string[]): string[] {
  const reasons = reviewChangedFiles.map((f) => `review record changed in ${f}`);
  for (const f of files) if (isProtectedPath(f.filename)) reasons.push(`protected path changed: ${f.filename}`);
  return reasons;
}

export function unsignedCommits(commits: readonly CommitInfo[]): CommitInfo[] {
  return commits.filter((c) => !c.verified);
}

// ---- CLI (GitHub Actions) ----

function gh(path: string): unknown {
  const out = execFileSync('gh', ['api', '--paginate', '--slurp', path], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const pages = JSON.parse(out) as unknown[];
  return pages.flat();
}

function fileJson(repo: string, path: string, ref: string): unknown {
  try {
    const out = execFileSync('gh', ['api', `repos/${repo}/contents/${path}?ref=${ref}`], { encoding: 'utf8' });
    const { content } = JSON.parse(out) as { content: string };
    return JSON.parse(Buffer.from(content, 'base64').toString('utf8'));
  } catch {
    return null; // file absent on that side
  }
}

function main(): void {
  const eventPath = process.env['GITHUB_EVENT_PATH'];
  const repo = process.env['GITHUB_REPOSITORY'];
  if (!eventPath || !repo) throw new Error('Run inside GitHub Actions (GITHUB_EVENT_PATH, GITHUB_REPOSITORY).');
  const pr = (JSON.parse(readFileSync(eventPath, 'utf8')) as { pull_request: { number: number; base: { sha: string }; head: { sha: string } } })
    .pull_request;

  const files = (gh(`repos/${repo}/pulls/${pr.number}/files`) as { filename: string; status: string }[]).map((f) => ({
    filename: f.filename,
    status: f.status,
  }));
  const changedReviews = files
    .filter((f) => isFactsFile(f.filename))
    .filter((f) => reviewChanged(fileJson(repo, f.filename, pr.base.sha), fileJson(repo, f.filename, pr.head.sha)))
    .map((f) => f.filename);
  const reasons = guardReasons(files, changedReviews);
  if (reasons.length === 0) {
    console.log('No review records or protected paths changed; no signature needed.');
    return;
  }
  const commits = (gh(`repos/${repo}/pulls/${pr.number}/commits`) as { sha: string; commit: { verification: { verified: boolean } } }[]).map((c) => ({
    sha: c.sha,
    verified: c.commit.verification.verified,
  }));
  const bad = unsignedCommits(commits);
  if (bad.length === 0) {
    console.log(`Signature required (${reasons.length} guarded change(s)) and every commit is verified.`);
    return;
  }
  console.error('This pull request needs signed commits because:');
  for (const r of reasons) console.error(`  - ${r}`);
  console.error('Unverified commits:');
  for (const c of bad) console.error(`  - ${c.sha}`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
