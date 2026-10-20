import { z } from 'zod';

/** Wikidata item id, the polity identity (ADR-005/007). */
export const Qid = z.string().regex(/^Q[1-9]\d*$/, 'Expected a Wikidata QID such as Q142');

/** A claim must be traceable: a URL plus the quoted words that support it (ADR-019). */
export const Citation = z.object({
  url: z.url(),
  quote: z.string().min(10, 'Quote the supporting words'),
});

const Year = z.number().int().min(-5000).max(3000);

export const Ruler = z
  .object({
    name: z.string().min(1),
    title: z.string().min(1), // king, mayor, lord, ...
    from: Year,
    to: Year.nullable(),
    source: Citation,
  })
  .refine((r) => r.to === null || r.to >= r.from, { message: 'Ruler period ends before it starts' });

/** Army size is shown only with a citation and a confidence level (CLAUDE.md). */
export const ArmySize = z.object({
  value: z.number().int().positive(),
  year: Year,
  confidence: z.enum(['low', 'medium', 'high']),
  source: Citation,
});

export const HistoricalEvent = z.object({
  year: Year,
  kind: z.enum(['attack', 'invasion', 'treaty', 'other']),
  summary: z.string().min(1).max(300),
  source: Citation,
});

/** Present only after a human review; the agent never writes it (ADR-019). Shown as a badge. */
export const Review = z.object({
  by: z.string().min(1),
  date: z.iso.date(),
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
});

export const Polity = z.object({
  qid: Qid,
  name: z.string().min(1),
  summary: z.string().min(1).max(500),
  rulers: z.array(Ruler),
  /** Offices below the ruler (head of government, ministers, ...), same shape as a ruler entry. */
  offices: z.array(Ruler).default([]),
  armySize: ArmySize.optional(),
  events: z.array(HistoricalEvent),
  review: Review.optional(),
});

export type Polity = z.infer<typeof Polity>;

/**
 * A page is indexable when it says something and every claim carries a source. The schema already
 * requires a citation on every ruler, office, army size and event, so a human review is an optional
 * badge, not a gate (ADR-019, revised).
 */
export function isIndexable(polity: Polity): boolean {
  return polity.rulers.length + polity.offices.length > 0;
}
