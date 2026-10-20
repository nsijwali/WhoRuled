import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Polity } from '../src/data/schema.ts';

/**
 * Repeatable import of "who held office in <year>" rows copied from Wikipedia's "List of state leaders"
 * pages. One raw file per snapshot year: pipeline/import/leaders-<year>.txt (`leaders-bc500.txt` for
 * 500 BC). A file starts with `# source: <url of the list page used>`; every other non-comment line is
 * `Wikipedia name|QID|Name, Title (from–to);...`, keeping only the list lines that cover that year.
 * Rows become rulers/offices with the list line as the quoted source. Curated (non-imported) rulers and
 * offices are never replaced; output never carries a `review` field (ADR-019).
 */
const IMPORT_DIR = 'pipeline/import';
const IMPORTED_URL = /^https:\/\/en\.wikipedia\.org\/wiki\/List_of_state_leaders/;

/** Per snapshot year: Wikipedia country name -> border dataset feature NAME (only where they differ). */
export const BORDER_NAME: Record<number, Record<string, string>> = {
  2010: {
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
  },
};

const RULER_TITLE = /president|king|queen|emperor|empress|emir|sultan|shah|tsar|prince|grand duke|duke|supreme leader|general secretary|chairman|druk|yang di|ao o le|führer|regent|caudillo|head of state/i;

export interface Entry {
  name: string;
  title: string;
  from: number;
  to: number | null;
  quote: string;
}

export interface Row {
  year: number;
  wikiName: string;
  url: string;
  lines: string[];
}

/** `leaders-1914.txt` -> 1914, `leaders-bc500.txt` -> -500; null for other files. */
export function yearFromFileName(file: string): number | null {
  const m = /^leaders-(bc)?(\d+)\.txt$/.exec(file);
  if (!m) return null;
  return m[1] ? -Number(m[2]) : Number(m[2]);
}

/** Parses a raw file into rows. Throws on a malformed row or a missing `# source:` header. */
export function parseRawFile(text: string, year: number): (Row & { qid: string })[] {
  const url = /^# source: (\S+)$/m.exec(text)?.[1];
  if (!url || !IMPORTED_URL.test(url)) throw new Error(`leaders-${year}: missing or foreign "# source:" header`);
  return text
    .split('\n')
    .filter((l) => l.trim() !== '' && !l.startsWith('#'))
    .map((row) => {
      const [wikiName, qid, rest, extra] = row.split('|');
      if (!wikiName || !qid || !rest || extra !== undefined || !/^Q[1-9]\d*$/.test(qid)) throw new Error(`Bad row: ${row}`);
      // Entries are joined with a bare `;`. A `; ` inside one list line (one person, several roles) is kept.
      return { year, wikiName, url, lines: rest.split(/;(?! )/), qid };
    });
}

/** Optional day and month, then a year: `2017`, `September 2017`, `26 September 2017`. */
const DATE = String.raw`(?:\d{1,2}\s+)?(?:[A-Z][a-z]+\s+)?(\d{4})`;
/** Full-date periods used by the 2020s list: `since 26 September 2017`, `25 April 2024 – 7 October 2024`. */
const DATED_PERIOD = new RegExp(String.raw`^(?:(since)\s+${DATE}|${DATE}(?:\s*[–—]\s*${DATE})?)$`);

/** A period as [from, to]; `to` is null while still in office. Null when the text is not a period. */
function parsePeriod(text: string): [number, number | null] | null {
  const p = /^(?:c\.\s*)?(\d{3,4})(?:\s*–\s*(?:c\.\s*)?(\d{3,4}|present))?$/.exec(text);
  if (p) return [Number(p[1]), p[2] === undefined ? Number(p[1]) : p[2] === 'present' ? null : Number(p[2])];
  const d = DATED_PERIOD.exec(text);
  if (!d) return null;
  if (d[1]) return [Number(d[2]), null];
  return [Number(d[3]), d[4] === undefined ? Number(d[3]) : Number(d[4])];
}

/**
 * First period in a list line that covers `year`: `Title (1903–1905, 1906–1907)`, `(c.1905)`,
 * `(1982–present)`, or the 2020s list's `title (since 26 September 2017)` and
 * `title (1 May 2020 – 2 June 2021); other title (since 2 June 2021)`.
 */
export function parseEntry(text: string, year: number): Entry | null {
  const comma = text.indexOf(', ');
  if (comma < 0) return null;
  const name = text.slice(0, comma).trim();
  for (const m of text.slice(comma + 2).matchAll(/([^()]*?)\s*\(([^()]*\d[^()]*)\)/g)) {
    for (const part of (m[2] ?? '').split(/,\s*/)) {
      const period = parsePeriod(part.trim());
      if (!period) continue;
      const [from, to] = period;
      const title = (m[1] ?? '').replace(/^[,;\s]+/, '').trim();
      if (title && from <= year && (to === null || to >= year)) return { name, title, from, to, quote: text };
    }
  }
  return null;
}

type Office = Polity['rulers'][number];
const isImported = (r: Office) => IMPORTED_URL.test(r.source.url);
const covers = (r: Office, year: number) => r.from <= year && (r.to === null || r.to >= year);
const key = (r: Office) => `${r.name}|${r.title}|${r.from}|${r.to}`;
const IMPORTED_SUMMARY = /: office-holders in [-\d, ]+, from Wikipedia's lists? of state leaders\.$/;

const toRecord = (e: Entry, row: Row): Office => ({
  name: e.name,
  title: e.title,
  from: e.from,
  to: e.to,
  source: { url: row.url, quote: e.quote.length >= 10 ? e.quote : `${e.quote} (${row.year})` },
});

/**
 * Builds one polity from all its rows (any number of snapshot years). Imported entries already in
 * `existing` are regenerated; curated ones are kept. Per year, the first ruler-like title becomes the
 * ruler unless a ruler already covers that year; everything else becomes an office.
 */
export function buildPolity(qid: string, rows: Row[], existing: Polity | null): Polity {
  const rulers = (existing?.rulers ?? []).filter((r) => !isImported(r));
  const offices = (existing?.offices ?? []).filter((r) => !isImported(r));
  const seen = new Set([...rulers, ...offices].map(key));
  const sorted = [...rows].sort((a, b) => a.year - b.year);
  for (const row of sorted) {
    const entries = row.lines.map((l) => parseEntry(l, row.year)).filter((e): e is Entry => e !== null);
    const held = new Set(rulers.filter((r) => covers(r, row.year)).map((r) => r.name));
    const fresh = entries.map((e) => toRecord(e, row)).filter((r) => !held.has(r.name) && !seen.has(key(r)) && seen.add(key(r)));
    const rulerIdx = held.size > 0 ? -1 : Math.max(0, fresh.findIndex((r) => RULER_TITLE.test(r.title)));
    fresh.forEach((r, i) => (i === rulerIdx ? rulers : offices).push(r));
  }
  rulers.sort((a, b) => a.from - b.from);
  const curated = existing !== null && !IMPORTED_SUMMARY.test(existing.summary);
  const name = curated ? existing.name : (sorted.at(-1)?.wikiName ?? existing?.name ?? qid);
  const years = [...new Set(sorted.map((r) => r.year))].map((y) => (y < 0 ? `${-y} BC` : String(y)));
  const summary = curated
    ? existing.summary
    : `${name}: office-holders in ${years.join(', ')}, from Wikipedia's ${years.length > 1 ? 'lists' : 'list'} of state leaders.`;
  return Polity.parse({
    qid,
    name,
    summary,
    rulers,
    offices,
    ...(existing?.armySize ? { armySize: existing.armySize } : {}),
    events: existing?.events ?? [],
    ...(existing?.review ? { review: existing.review } : {}),
  });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const factsDir = 'data/facts';
  const mapPath = join(factsDir, 'feature-map.json');
  const featureMap = JSON.parse(readFileSync(mapPath, 'utf8')) as Record<string, Record<string, string>>;
  const byQid = new Map<string, Row[]>();
  const perYear: Record<string, number> = {};
  for (const file of readdirSync(IMPORT_DIR).sort()) {
    const year = yearFromFileName(file);
    if (year === null) continue;
    const yearMap = (featureMap[String(year)] ??= {});
    for (const { qid, ...row } of parseRawFile(readFileSync(join(IMPORT_DIR, file), 'utf8'), year)) {
      const border = BORDER_NAME[year]?.[row.wikiName] ?? row.wikiName;
      if (yearMap[border] && yearMap[border] !== qid) throw new Error(`${file}: "${border}" is already mapped to ${yearMap[border]}`);
      yearMap[border] = qid;
      byQid.set(qid, [...(byQid.get(qid) ?? []), row]);
      perYear[year] = (perYear[year] ?? 0) + 1;
    }
  }
  for (const [qid, rows] of byQid) {
    const file = join(factsDir, `${qid}.json`);
    const existing = existsSync(file) ? Polity.parse(JSON.parse(readFileSync(file, 'utf8'))) : null;
    writeFileSync(file, `${JSON.stringify(buildPolity(qid, rows, existing), null, 2)}\n`);
  }
  writeFileSync(mapPath, `${JSON.stringify(featureMap, null, 2)}\n`);
  console.log(JSON.stringify({ polities: byQid.size, rowsPerYear: perYear }));
}
