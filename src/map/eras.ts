export interface Era {
  readonly from: number;
  readonly name: string;
}

/** Display eras, ascending by start year. A year belongs to the last era that starts at or before it. */
export const ERAS: readonly Era[] = [
  { from: -5000, name: 'Iron Age' },
  { from: -300, name: 'Classical World' },
  { from: 400, name: 'Early Middle Ages' },
  { from: 1000, name: 'High Middle Ages' },
  { from: 1400, name: 'Age of Discovery' },
  { from: 1700, name: 'Age of Revolutions' },
  { from: 1900, name: 'World Wars' },
  { from: 1945, name: 'Cold War' },
  { from: 1991, name: 'Modern Age' },
];

export function eraOf(year: number): Era {
  let current: Era = ERAS[0] as Era;
  for (const era of ERAS) if (era.from <= year) current = era;
  return current;
}
