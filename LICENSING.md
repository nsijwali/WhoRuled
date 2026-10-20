# Licensing

This repository mixes three kinds of material, each under its own terms.

| Material | Where | Licence |
| --- | --- | --- |
| Source code | everything except the folders below | MIT (see `LICENSE`) |
| Curated historical facts | `data/facts/` (hand-written entries) | CC0 1.0 (public domain dedication) |
| Imported office-holder rows | `data/facts/` entries whose source is a Wikipedia list (`pipeline/import/`) | CC BY-SA 4.0, attributed to Wikipedia contributors; reuse must keep attribution and share-alike |
| Border geometry | `data/borders-gpl/` and files built from it | GNU General Public License, as published by the upstream project |

The border data comes from the open historical-basemaps project
(https://github.com/aourednik/historical-basemaps). Check that repository for the exact licence
version and attribution wording before redistributing the geometry or the TopoJSON built from it.

Geometry and facts are kept in separate folders so each can be reused under its own licence.
