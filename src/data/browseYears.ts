import { readFacts, type FactsBuild } from '../../pipeline/build-facts.ts';

let cached: FactsBuild | undefined;
/** The validated facts, read once per build rather than once per page. */
export function loadFacts(): FactsBuild {
  cached ??= readFacts('data/facts');
  return cached;
}

/** A snapshot needs at least this many states with known leaders to earn a page of its own. */
export const MIN_STATES_FOR_YEAR_PAGE = 15;

/** Snapshot years that get a static "who ruled the world in <year>" page, ascending. */
export function browseYears(): number[] {
  const { index } = loadFacts();
  return Object.entries(index)
    .filter(([, names]) => Object.keys(names).length >= MIN_STATES_FOR_YEAR_PAGE)
    .map(([year]) => Number(year))
    .sort((a, b) => a - b);
}
