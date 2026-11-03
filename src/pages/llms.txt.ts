import { SITE_NAME, SITE_URL } from '../config/site';

/** Plain-text guide for AI tools: what the site is and which pages to read. Generated from SITE_URL so it stays correct on any domain. */
export function GET(): Response {
  const url = (path: string) => new URL(path, SITE_URL).href;
  const body = `# ${SITE_NAME}

> An interactive world-history map: who ruled each state from 1000 BC to today, with a link to a source for each ruler.

## Pages

- [Map](${url('/')}): slide through time and click a state to see its rulers and government.
- [About and licences](${url('/about/')}): data sources and their licences.
- [Privacy](${url('/privacy/')}): what the site collects.
- [Cookies](${url('/cookies/')}): what cookies and storage are used.
- [Terms](${url('/terms/')}): how the information may be used.

## Sitemap

- [Sitemap](${url('/sitemap.xml')}): every state and state-year page.
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
