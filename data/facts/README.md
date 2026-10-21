# Curated facts (CC0)

One JSON file per polity, named by Wikidata QID (for example `Q142.json`), validated against `src/data/schema.ts`.

- Every ruler, army size and event needs a source URL and a quoted passage.
- Never add a `review` field by hand or from an automated run. Only the owner records a review.
- Rows imported from Wikipedia lists stay under CC BY-SA 4.0 (see `LICENSING.md`); hand-written entries are CC0.
- This folder holds facts only. Border geometry lives in `data/borders-gpl/` (GPL) and `data/borders-ne/` (public domain) under their own licences.

## Offices below the ruler

`offices` lists office-holders under the ruler (prime minister, premier, chancellor, ...), same shape as a ruler entry with its own source.

## Bulk import (1700–2026)

`npm run import:leaders` regenerates imported rulers/offices from `pipeline/import/leaders-<year>.txt`, rows copied from Wikipedia's "List of state leaders" pages (each file names its page in a `# source:` header). Each row's source quote is the list line itself. Curated rulers already in a file are kept. Army sizes are never imported.

- 2010: 176 states from "List of state leaders in the 2010s".
- 2026 (present day): office-holders in office in 2026 per "List of state leaders in the 2020s", keeping only list lines whose person Wikidata also gives as the country's current head of state (P35) or head of government (P6), and only countries that have a Natural Earth feature (QID checked against its `WIKIDATAID`). See the header of `leaders-2026.txt` for the revision and the date read.
- 1880–1994: from the 19th- and 20th-century lists; see each file's header.
- Before 1880 (1815, 1800, 1700, ...): from the century lists ("List of state leaders in the 19th century (1801–1850)", "... in the 18th century", "... in the 17th century", ...). Only list lines whose period covers the snapshot year, only states whose linked article's Wikidata item exists in that year (inception/dissolution checked) and that match a border feature of that year. Each file's header gives the revision read and the states skipped and why. Gaps in a list stay gaps.
