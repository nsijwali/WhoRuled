# Licensing

This repository mixes three kinds of material, each under its own terms.

| Material | Where | Licence |
| --- | --- | --- |
| Source code | everything except the folders below | MIT (see `LICENSE`) |
| Curated historical facts | `data/facts/` (hand-written entries) | CC0 1.0 (public domain dedication) |
| Imported office-holder rows | `data/facts/` entries whose source is a Wikipedia list (`pipeline/import/`) | CC BY-SA 4.0, attributed to Wikipedia contributors; reuse must keep attribution and share-alike |
| Border geometry | `data/borders-gpl/` and files built from it | GNU General Public License, as published by the upstream project |
| Present-day border geometry (2026 snapshot) | `data/borders-ne/` and the 2026 TopoJSON built from it | Public domain (Natural Earth) |

The border data comes from the open historical-basemaps project
(https://github.com/aourednik/historical-basemaps). Check that repository for the exact licence
version and attribution wording before redistributing the geometry or the TopoJSON built from it.

The present-day (2026) map uses Natural Earth's 1:50m admin-0 countries
(`ne_50m_admin_0_countries.geojson`, Natural Earth 5.2.0 as committed at
https://github.com/nvkelso/natural-earth-vector, commit `ca96624a56bd078437bca8184e78163e5039ad19`,
SHA-256 `3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb`). Natural Earth states
"All versions of Natural Earth raster + vector map data ... are in the public domain"; no permission
or credit is required, but we credit it anyway ("Made with Natural Earth", https://www.naturalearthdata.com).
The file is committed unmodified; the pipeline (`pipeline/build-geo.ts`) keeps only the name,
sovereign and type columns. The geometry dates from the 2022 release and follows Natural Earth's
default (de facto) point of view. Its `WIKIDATAID` column is used to check the polity QIDs of the
2026 facts.

Geometry and facts are kept in separate folders so each can be reused under its own licence.
