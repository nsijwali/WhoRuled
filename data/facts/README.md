# Curated facts (CC0)

One JSON file per polity, named by Wikidata QID (for example `Q142.json`), validated against `src/data/schema.ts`.

- Every ruler, army size and event needs a source URL and a quoted passage.
- Never add a `review` field by hand or from an automated run. Only the owner records a review.
- This folder holds facts only. Border geometry lives in `data/borders-gpl/` under its own licence.

## Offices below the ruler

`offices` lists office-holders under the ruler (prime minister, premier, chancellor, ...), same shape as a ruler entry with its own source.

## Bulk import (2010)

`npm run import:leaders` regenerates 2010 rulers/offices for 175 states from `pipeline/import/leaders-2010.txt`, rows copied from Wikipedia's "List of state leaders in the 2010s". Each row's source quote is the list line itself. Curated rulers already in a file are kept. Army sizes are never imported.
