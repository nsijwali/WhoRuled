# WhoRuled — agent conventions

- Static-first: Astro + one React island, TypeScript strict. No runtime backend.
- Geometry (GPL, data/borders-gpl) stays separate from facts (CC0) and code.
- Polity ID = Wikidata QID. Facts need provenance; army size only with citation + confidence.
- Never set a page's review field (only the owner records a review). Pages are indexable when every claim has a source; the review is a badge (ADR-019, revised by the owner 2026-10-20).
- Work on branches and PRs only; the owner merges. No secrets in the repo.
- Never use dangerouslySetInnerHTML. Do not add dependencies without justification.
- Checks: `npm run lint && npm run typecheck && npm test && npm run build`.
