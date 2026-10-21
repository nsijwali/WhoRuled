import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

/** Google AdSense and Cloudflare Web Analytics, the only third parties the site can ever load (both are off until configured). */
const ADS_SCRIPTS = [
  'https://pagead2.googlesyndication.com',
  'https://partner.googleadservices.com',
  'https://tpc.googlesyndication.com',
  'https://www.googletagservices.com',
  'https://static.cloudflareinsights.com',
];

export default defineConfig({
  integrations: [react()],
  output: 'static',
  security: {
    // Astro hashes its own inline scripts and styles into a <meta> policy; everything else is listed here.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://pagead2.googlesyndication.com https://*.g.doubleclick.net https://ep1.adtrafficquality.google https://cloudflareinsights.com",
        "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.safeframe.googlesyndication.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      scriptDirective: { resources: ["'self'", ...ADS_SCRIPTS] },
      // Inline style attributes cannot run script; allow them for the few small layout tweaks.
      styleDirective: { resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }] },
    },
  },
});
