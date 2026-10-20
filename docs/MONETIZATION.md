# Switching on support links, analytics and ads

Everything is OFF until you set build-time variables. In the Cloudflare dashboard open the Worker →
Settings → Build → Variables (build variables), add any of these, then redeploy:

| Variable | Value | Effect |
| --- | --- | --- |
| `PUBLIC_SITE_URL` | your custom domain, e.g. `https://whoruled.example` | canonical URLs, sitemap, robots |
| `PUBLIC_SUPPORT_URL` | e.g. `https://github.com/sponsors/nsijwali` or a Ko-fi page | "Support this project" link in the header |
| `PUBLIC_CF_ANALYTICS_TOKEN` | token from Cloudflare → Web Analytics → add site | cookie-free page-view counts |
| `PUBLIC_ADS_CLIENT` | AdSense id `ca-pub-…` | consent banner, ad slot on state pages, `/ads.txt` |

Order: custom domain → analytics (watch for 1,000 monthly views) → support link → apply to AdSense
with the custom domain → set `PUBLIC_ADS_CLIENT` after approval. Ads load only after a visitor accepts the banner and never appear on the map screen.
