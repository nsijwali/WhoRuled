import { isIndexable, type Polity } from './schema.ts';
import { inYear } from '../map/format.ts';
import { loadFacts } from './browseYears.ts';

type Ruler = Polity['rulers'][number];

/** Events within this many years of a page's year count as year-specific context. */
export const NEAR_EVENT_YEARS = 25;

export interface StateYear {
  polity: Polity;
  year: number;
  /** Rulers in office in `year`, earliest first. Never empty. */
  rulers: Ruler[];
  /** Other office holders in `year`. */
  offices: Ruler[];
  /**
   * Whether search engines may index this page. False when the page is only a template around a
   * single ruler with no office holders and no nearby events, which Google treats as thin content.
   */
  indexable: boolean;
}

/** A page with one name and nothing else says little that the state's own page does not. */
export function isThinStateYear(polity: Pick<Polity, 'events'>, year: number, rulers: Ruler[], offices: Ruler[]): boolean {
  const nearEvents = polity.events.some((e) => Math.abs(e.year - year) <= NEAR_EVENT_YEARS);
  return rulers.length + offices.length <= 1 && !nearEvents;
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
      const offices = polity.offices.filter((o) => inYear(o, year));
      const indexable = isIndexable(polity) && !isThinStateYear(polity, year, rulers, offices);
      out.push({ polity, year, rulers, offices, indexable });
    }
  }
  return out.sort((a, b) => a.polity.qid.localeCompare(b.polity.qid) || a.year - b.year);
}
