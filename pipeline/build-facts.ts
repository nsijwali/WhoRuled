import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { Polity, Qid } from '../src/data/schema.ts';

/** Snapshot year -> (border feature name -> polity QID). Kept apart from the facts so geometry stays separate (CLAUDE.md). */
const FeatureMap = z.record(z.string().regex(/^-?\d+$/), z.record(z.string().min(1), Qid));

export interface FactsBuild {
  readonly polities: readonly Polity[];
  readonly index: z.infer<typeof FeatureMap>;
}

/** Reads and validates every `Q<id>.json` plus `feature-map.json`. Throws with the file name on any problem. */
export function readFacts(factsDir: string): FactsBuild {
  const polities: Polity[] = [];
  for (const file of readdirSync(factsDir).filter((f) => /^Q[1-9]\d*\.json$/.test(f)).sort()) {
    const parsed = Polity.safeParse(JSON.parse(readFileSync(join(factsDir, file), 'utf8')));
    if (!parsed.success) throw new Error(`${file}: ${z.prettifyError(parsed.error)}`);
    if (`${parsed.data.qid}.json` !== file) throw new Error(`${file}: file name must match qid ${parsed.data.qid}`);
    polities.push(parsed.data);
  }
  const mapParsed = FeatureMap.safeParse(JSON.parse(readFileSync(join(factsDir, 'feature-map.json'), 'utf8')));
  if (!mapParsed.success) throw new Error(`feature-map.json: ${z.prettifyError(mapParsed.error)}`);
  const known = new Set(polities.map((p) => p.qid));
  for (const [year, names] of Object.entries(mapParsed.data))
    for (const [name, qid] of Object.entries(names))
      if (!known.has(qid)) throw new Error(`feature-map.json: ${year} "${name}" points to ${qid}, which has no facts file`);
  return { polities, index: mapParsed.data };
}

export function writeFacts(build: FactsBuild, outDir: string): void {
  mkdirSync(outDir, { recursive: true });
  for (const polity of build.polities) writeFileSync(join(outDir, `${polity.qid}.json`), JSON.stringify(polity));
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(build.index));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const build = readFacts('data/facts');
  writeFacts(build, 'public/data/facts');
  console.log(JSON.stringify({ polities: build.polities.length }));
}
