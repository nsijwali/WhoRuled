import { isIndexable, type Polity } from './schema.ts';
import { inYear } from '../map/format.ts';
import { loadFacts } from './browseYears.ts';

type Ruler = Polity['rulers'][number];

export interface StateYear {
  polity: Polity;
  year: number;
  /** Rulers in office in `year`, earliest first. Never empty. */
  rulers: Ruler[];
  /** Other office holders in `year`. */
  offices: Ruler[];
  indexable: boolean;
}

/**
 * One entry per state that is on the map in a snapshot year AND has at least one sourced ruler
 * in office that year. Pages are only made for these, so every claim on a page has a source.
 */
export function stateYears(): StateYear[] {
  const { polities, index } = loadFacts();
  const byQid = new Map(polities.map((p) => [p.qid, p]));
  const out: StateYear[] = [];
  for (const [yearKey, names] of Object.entries(index)) {
    const year = Number(yearKey);
    for (const qid of new Set(Object.values(names))) {
      const polity = byQid.get(qid);
      if (!polity) continue;
      const rulers = polity.rulers.filter((r) => inYear(r, year));
      if (rulers.length === 0) continue;
      out.push({ polity, year, rulers, offices: polity.offices.filter((o) => inYear(o, year)), indexable: isIndexable(polity) });
    }
  }
  return out.sort((a, b) => a.polity.qid.localeCompare(b.polity.qid) || a.year - b.year);
}
