import { PAYPAL_ME, SITE_URL, UPI_ID } from '../config/site';
import { browseYears, loadFacts } from '../data/browseYears';
import { isIndexable } from '../data/schema';
import { stateYears } from '../data/stateYears';

export function GET(): Response {
  const { polities } = loadFacts();
  const paths = ['/', '/about/', '/privacy/', ...(PAYPAL_ME || UPI_ID ? ['/support/'] : []), ...browseYears().map((y) => `/year/${y}/`), ...polities.filter(isIndexable).map((p) => `/state/${p.qid}/`), ...stateYears().filter((s) => s.indexable).map((s) => `/state/${s.polity.qid}/${s.year}/`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map((p) => `  <url><loc>${new URL(p, SITE_URL).href}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
