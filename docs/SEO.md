# Search and traffic plan

Nobody can promise "top of search". Ranking comes from three things: pages that answer what people
type, other sites linking to you, and time. The site handles the first; the rest is outreach.

## What the site does for search (built)
- Static, crawlable pages: one per state (`/state/<qid>/`, "Who ruled France?") and one per well-covered
  snapshot year (`/year/<year>/`, "Who ruled the world in 1914?"). The map itself is a client app that
  search engines cannot read, so these pages carry the text.
- Each page has a unique title and description, a canonical URL, a sitemap entry, breadcrumb structured data
  and a share card (`public/og.png`).
- Pages for states with no sourced leaders are `noindex`; a year needs 15+ states with leaders to get a page.
  Thin pages hurt more than they help. Adding leader data for more years adds pages automatically.

## Owner steps (need your accounts)
1. Buy the domain, then set `PUBLIC_SITE_URL` so canonical URLs and the sitemap use it.
2. Google Search Console: add the domain, verify, submit `/sitemap.xml`. Bing Webmaster Tools: import from Search Console.
3. Cloudflare Web Analytics: set `PUBLIC_CF_ANALYTICS_TOKEN` so you can see visits and which pages work.
4. Re-submit after each data release; check Search Console's "Pages" report for anything not indexed.

## Getting links (the part that moves rankings)
- Post it where history and map people already are (drafts in `docs/LAUNCH.md`). Read each community's
  self-promotion rules first; a genuine "I built this" post with a good screenshot works, spam does not.
- Ask history teachers, bloggers and newsletter writers to link it; offer the year pages as a resource.
- Answer "who ruled X in year Y" questions on Q&A sites with a link to the specific page, where allowed.
- Do not buy links or use link farms; Google penalises both.

## Content that earns traffic
- More sourced leaders for earlier years (1700 and before) create more year pages.
- Next ideas: per-state timelines, "on this day" pages, themed collections (empires at their height).
