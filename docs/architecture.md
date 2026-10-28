# Architecture

WhoRuled is a static site. Data is prepared at build time, and the browser only fetches prebuilt JSON and TopoJSON files.

```mermaid
flowchart LR
  subgraph Sources
    GPL["data/borders-gpl (GPL geometry)"]
    NE["data/borders-ne (public domain, modern years)"]
    Leaders["pipeline/import/leaders-*.txt (sourced ruler rows)"]
    FeatureMap["data/facts/feature-map.json (name to QID per year)"]
  end

  subgraph Build["Build (prebuild)"]
    Clean["scripts/clean-data.mjs"]
    BuildGeo["pipeline/build-geo.ts"]
    BuildFacts["pipeline/build-facts.ts"]
    Import["pipeline/import-leaders.ts (npm run import:leaders)"]
  end

  subgraph Output["public/data"]
    Geo["geo/*.topojson + manifest.json"]
    FactsOut["facts/Q*.json + index.json"]
  end

  subgraph Site["Astro static pages (src/pages)"]
    Home["index.astro"]
    YearPage["year/[year].astro"]
    StatePage["state/[qid].astro"]
    StateYearPage["state/[qid]/[year].astro"]
    Sitemap["sitemap.xml.ts"]
  end

  subgraph Browser["Browser (React island)"]
    MapIsland["MapIsland.tsx"]
    LoadGeo["map/loadGeo.ts"]
    LoadFacts["map/loadFacts.ts"]
    CanvasMap["map/CanvasMap.ts"]
  end

  Leaders --> Import
  Import --> FeatureMap
  Import --> FactsSrc["data/facts/Q*.json"]
  Clean --> BuildGeo
  GPL --> BuildGeo
  NE --> BuildGeo
  BuildGeo --> Geo
  FactsSrc --> BuildFacts
  FeatureMap --> BuildFacts
  BuildFacts --> FactsOut
  FactsOut --> YearPage
  FactsOut --> StatePage
  FactsOut --> StateYearPage
  FactsOut --> Sitemap
  Home --> MapIsland
  MapIsland --> LoadGeo
  MapIsland --> LoadFacts
  MapIsland --> CanvasMap
  LoadGeo --> Geo
  LoadFacts --> FactsOut
```

## Notes

- **Geometry and facts are separate.** Border geometry is GPL and lives in `data/borders-*`. Facts are CC0 and live in `data/facts/`. Each polity is identified by its Wikidata QID.
- **Only the map island runs in the browser.** Everything else is rendered to static HTML at build time.
- **Static pages read facts at build time.** `src/data/browseYears.ts` and `src/data/stateYears.ts` read the facts through `pipeline/build-facts.ts`. The sitemap includes only pages that pass `isIndexable`.
- **Build-time configuration** comes from `PUBLIC_*` environment variables, read in `src/config/site.ts`.
- **CI** (`.github/workflows/ci.yml`) runs lint, typecheck, tests, build, and a browser smoke test. `review-guard.yml` runs `pipeline/review-guard.ts`.
