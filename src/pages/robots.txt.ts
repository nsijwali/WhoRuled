import { SITE_URL } from '../config/site';

export function GET(): Response {
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', SITE_URL).href}\n`, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
