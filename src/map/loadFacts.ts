import { z } from 'zod';
import { Polity, Qid } from '../data/schema';

const FactsIndex = z.record(z.string(), z.record(z.string(), Qid));
export type FactsIndex = z.infer<typeof FactsIndex>;

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
  return res.json();
}

/** Snapshot year -> (feature name -> polity QID). An empty index is valid: no facts are curated yet. */
export async function loadFactsIndex(base = '/data/'): Promise<FactsIndex> {
  return FactsIndex.parse(await fetchJson(`${base}facts/index.json`));
}

export async function loadPolity(qid: string, base = '/data/'): Promise<Polity> {
  return Polity.parse(await fetchJson(`${base}facts/${Qid.parse(qid)}.json`));
}
