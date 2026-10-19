# Deploying WhoRuled (Cloudflare Pages)

The site is static, so hosting is free and there is nothing to run.

## One-time setup (owner)

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick `nsijwali/WhoRuled`.
2. Build settings:
   - Framework preset: Astro
   - Build command: `npm run build` (this also builds the geometry via `prebuild`)
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `22`
3. Production branch: `main`. Every pull request branch then gets its own preview URL.

## Rules

- Pages stay `noindex` until a human review is recorded (ADR-019). The `*.pages.dev` host must never be indexed.
- Keep the built file count under 12,000 (Cloudflare's limit is 20,000).
- No secrets in the repo or in build variables used by the browser.

## Review loop

Open the preview URL from the pull request, test it, comment, then merge. Merging to `main` publishes.
