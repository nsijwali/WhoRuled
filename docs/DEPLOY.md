# Deploying WhoRuled (Cloudflare Workers static assets)

The site is static, so hosting is free and there is nothing to run. Cloudflare's dashboard now creates
Git-connected projects as Workers (static assets); `wrangler.jsonc` tells it to serve `dist/`.

## One-time setup (owner)

1. Cloudflare dashboard → Workers & Pages → Create application → GitHub → pick `nsijwali/WhoRuled`.
2. Project name: `whoruled` (must match `name` in `wrangler.jsonc`, or the build fails).
3. Build command: `npm run build` (also builds the geometry via `prebuild`).
4. Deploy command: `npx wrangler deploy`. Preview command: `npx wrangler preview`.
5. Leave "Enable Preview builds" on. Production branch: `main`.
6. Build variable: `NODE_VERSION` = `22` (Advanced settings).

## Rules

- Pages are indexable when every claim has a source; a recorded review only adds a badge (ADR-019). The `*.workers.dev` host must not be indexed; the canonical host is https://whoruled.nitinsijwali.com.
- Keep the built file count under 12,000 (Cloudflare's limit is 20,000).
- No secrets in the repo or in build variables used by the browser.

## Review loop

Open the preview URL from the pull request, test it, comment, then merge. Merging to `main` publishes.
