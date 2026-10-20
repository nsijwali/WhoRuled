# Present-day borders (public domain)

`ne_50m_admin_0_countries.geojson` is Natural Earth's 1:50m admin-0 countries layer, copied unmodified
from https://github.com/nvkelso/natural-earth-vector (commit `ca96624a56bd078437bca8184e78163e5039ad19`,
`geojson/ne_50m_admin_0_countries.geojson`, Natural Earth 5.2.0).

- SHA-256: `3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb`
- Licence: public domain (https://www.naturalearthdata.com/about/terms-of-use/). See `LICENSING.md`.
- Used for the 2026 snapshot only (`MODERN_SNAPSHOTS` in `pipeline/build-geo.ts`). The GPL
  historical-basemaps files in `data/borders-gpl/` end at 2010 and stay in their own folder.

To refresh: download the same path at a newer commit, update the hash above and in `LICENSING.md`,
and run `npm run pipeline:geo 2026`.
