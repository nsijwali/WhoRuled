import { readFacts } from '../../pipeline/build-facts.ts';
import { PAYPAL_ME, SITE_URL } from '../config/site';
import { isIndexable } from '../data/schema';

export function GET(): Response {
  const { polities } = readFacts('data/facts');
  const paths = ['/', '/about/', '/privacy/', ...(PAYPAL_ME ? ['/support/'] : []), ...polities.filter(isIndexable).map((p) => `/state/${p.qid}/`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map((p) => `  <url><loc>${new URL(p, SITE_URL).href}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
