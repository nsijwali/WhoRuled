import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Polity } from '../src/data/schema.ts';

/**
 * One-off, repeatable import of "who held office in <year>" rows copied from Wikipedia's
 * "List of state leaders in the 2010s" (pipeline/import/leaders-2010.txt, one country per line:
 * `Wikipedia name|QID|Name, Title (from–to);...`). Rows become rulers/offices with the list as source.
 * Existing curated rulers are never replaced; unreviewed output carries no `review` field (ADR-019).
 */
const SOURCE_URL = 'https://en.wikipedia.org/wiki/List_of_state_leaders_in_the_2010s';
const YEAR = 2010;

/** Wikipedia country name -> border dataset feature NAME (only where they differ). */
const BORDER_NAME: Record<string, string> = {
  'Democratic Republic of the Congo': 'Zaire',
  'Republic of the Congo': 'Congo',
  Eswatini: 'Swaziland',
  Gambia: 'Gambia, The',
  Tanzania: 'Tanzania, United Republic of',
  'Trinidad and Tobago': 'Trinidad',
  'North Korea': "Korea, Democratic People's Republic of",
  'South Korea': 'Korea, Republic of',
  'North Macedonia': 'Macedonia',
  'Republic of Ireland': 'Ireland',
  'The Netherlands': 'Netherlands',
  Belarus: 'Byelarus',
  'Northern Cyprus': 'Turkish Cypriot-administered area',
};

const RULER_TITLE = /president|king|queen|emperor|emir|sultan|prince|grand duke|supreme leader|general secretary|chairman|druk|yang di|ao o le/i;

interface Entry {
  name: string;
  title: string;
  from: number;
  to: number | null;
  quote: string;
}

export function parseEntry(text: string): Entry | null {
  const comma = text.indexOf(', ');
  if (comma < 0) return null;
  const name = text.slice(0, comma).trim();
  for (const m of text.slice(comma + 2).matchAll(/([^()]+?)\s*\((\d{4})(?:–(\d{4}|present))?\)/g)) {
    const from = Number(m[2]);
    const to = m[3] === undefined ? from : m[3] === 'present' ? null : Number(m[3]);
    if (from <= YEAR && (to === null || to >= YEAR))
      return { name, title: (m[1] ?? '').replace(/^,\s*/, '').trim(), from, to, quote: text };
  }
  return null;
}

const toRecord = (e: Entry) => ({
  name: e.name,
  title: e.title,
  from: e.from,
  to: e.to,
  source: { url: SOURCE_URL, quote: e.quote.length >= 10 ? e.quote : `${e.quote} (${YEAR})` },
});

export function buildPolity(wikiName: string, qid: string, lines: string[], existing: Polity | null): Polity {
  const entries = lines.map(parseEntry).filter((e): e is Entry => e !== null);
  const seen = new Set<string>();
  const unique = entries.filter((e) => !seen.has(`${e.name}|${e.title}`) && seen.add(`${e.name}|${e.title}`));
  const rulerIdx = Math.max(0, unique.findIndex((e) => RULER_TITLE.test(e.title)));
  const heldNames = new Set((existing?.rulers ?? []).map((r) => r.name));
  const rulers = existing ? existing.rulers : unique.slice(rulerIdx, rulerIdx + 1).map(toRecord);
  const offices = unique
    .filter((e, i) => (existing ? !heldNames.has(e.name) : i !== rulerIdx))
    .map(toRecord);
  return Polity.parse({
    qid,
    name: existing?.name ?? wikiName,
    summary: existing?.summary ?? `${wikiName}: office-holders in ${YEAR}, from Wikipedia's list of state leaders.`,
    rulers,
    offices,
    ...(existing?.armySize ? { armySize: existing.armySize } : {}),
    events: existing?.events ?? [],
  });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const factsDir = 'data/facts';
  const mapPath = join(factsDir, 'feature-map.json');
  const featureMap = JSON.parse(readFileSync(mapPath, 'utf8')) as Record<string, Record<string, string>>;
  const year = (featureMap[String(YEAR)] ??= {});
  let count = 0;
  for (const row of readFileSync('pipeline/import/leaders-2010.txt', 'utf8').split('\n').filter(Boolean)) {
    const [wikiName, qid, rest] = row.split('|');
    if (!wikiName || !qid || !rest) throw new Error(`Bad row: ${row}`);
    const file = join(factsDir, `${qid}.json`);
    const existing = existsSync(file) ? Polity.parse(JSON.parse(readFileSync(file, 'utf8'))) : null;
    const polity = buildPolity(wikiName, qid, rest.split(';'), existing);
    writeFileSync(file, `${JSON.stringify(polity, null, 2)}\n`);
    year[BORDER_NAME[wikiName] ?? wikiName] = qid;
    count += 1;
  }
  writeFileSync(mapPath, `${JSON.stringify(featureMap, null, 2)}\n`);
  console.log(JSON.stringify({ imported: count }));
}
