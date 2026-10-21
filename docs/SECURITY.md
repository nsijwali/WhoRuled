# Security notes

WhoRuled is a static site: no server code, no database, no accounts, no secrets in the repo.

- **Content-Security-Policy.** Astro hashes its own inline scripts and styles into a `<meta>` policy
  (`security.csp` in `astro.config.mjs`); everything else is `'self'`. The only third parties allowed are
  Google AdSense and Cloudflare Web Analytics, which stay off until configured. If an ad or analytics
  change is blocked, the browser console says which directive refused it.
- **Response headers** (`public/_headers`, served by Cloudflare): `frame-ancestors 'none'` and
  `X-Frame-Options` (no clickjacking), `nosniff`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`,
  `Permissions-Policy` (camera, microphone, location and payment off) and HSTS.
- **External links** open in a new tab with `target="_blank" rel="noopener noreferrer"`: `noopener` stops the
  new page controlling ours (reverse tabnabbing) and `noreferrer` stops it learning where the visitor came from.
  Links inside the site open normally, because forcing new tabs there breaks Back and hurts accessibility.
  `e2e/smoke.mjs` fails if any external link on the main pages lacks these attributes.
- **No `dangerouslySetInnerHTML`.** Wikipedia-sourced text is rendered by React/Astro as text.
- **Payments** happen on the payer's own app (UPI) or PayPal's site; the site loads no payment scripts.
