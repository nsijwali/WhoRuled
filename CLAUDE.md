# WhoRuled — agent conventions

- Static-first: Astro + one React island, TypeScript strict. No runtime backend.
- Geometry (GPL, data/borders-gpl) stays separate from facts (CC0) and code.
- Polity ID = Wikidata QID. Facts need provenance; army size only with citation + confidence.
- Never set a page's review field; unreviewed pages stay noindex (ADR-019).
- Work on branches and PRs only; the owner merges. No secrets in the repo.
- Never use dangerouslySetInnerHTML. Do not add dependencies without justification.
- Checks: `npm run lint && npm run typecheck && npm test && npm run build`.
