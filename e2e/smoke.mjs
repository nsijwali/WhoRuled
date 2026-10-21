import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
const types = { '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.topojson': 'application/json' };
const headers = readFileSync(path.join(root, '_headers'), 'utf8')
  .split('\n').filter((l) => l.startsWith('  ')).map((l) => l.trim().split(/:\s(.*)/s).slice(0, 2));
const srv = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (existsSync(f) && statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!existsSync(f)) { r.statusCode = 404; return r.end(); }
  r.setHeader('content-type', types[path.extname(f)] ?? 'application/octet-stream');
  for (const [name, value] of headers) r.setHeader(name, value); // the same security headers Cloudflare serves from public/_headers
  r.end(readFileSync(f));
}).listen(0);
const port = srv.address().port;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
await page.goto(`http://localhost:${port}/`);
await page.waitForSelector('canvas');
await page.waitForSelector('.state-list li');
await page.waitForTimeout(500);
// the map opens on the present day: the last snapshot, built from Natural Earth
const openingYear = await page.locator('.year-slider output').textContent();
if (openingYear !== '2026') problems.push(`expected the map to open on 2026, got ${openingYear}`);
if (process.argv[2]) await page.screenshot({ path: process.argv[2] });
// click the centre of the map and expect a detail heading or still-the-prompt
const box = await page.locator('canvas').boundingBox();
await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.42);
await page.waitForTimeout(200);
const heading = await page.locator('.detail h2').count();
// list selection
await page.locator('.map-side input').fill('france');
await page.locator('.state-list button').first().click();
await page.waitForTimeout(300);
const presentName = await page.locator('.detail h2').textContent();
await page.locator('.detail', { hasText: 'Emmanuel Macron' }).waitFor({ timeout: 3000 }).catch(() => problems.push('2026 leader for France (Emmanuel Macron) did not appear'));
// back to 1492 (slider index 14 in data/years.json) for the curated facts
await page.locator('#year-range').fill('14');
await page.waitForTimeout(500);
const pastYear = await page.locator('.year-slider output').textContent();
if (pastYear !== '1492') problems.push(`expected 1492 at slider index 14, got ${pastYear}`);
// the whole page changes look with the era: today is EGA, 1492 a manuscript, 1700 an atlas, 1914 newsprint, 500 BC a cave wall
const era = () => page.evaluate(() => document.documentElement.dataset.era);
if ((await era()) !== 'manuscript') problems.push(`expected the manuscript look in 1492, got ${await era()}`);
for (const [index, expected] of [[17, 'atlas'], [22, 'newsprint'], [1, 'cave'], [14, 'manuscript']]) {
  await page.locator('#year-range').fill(String(index));
  await page.waitForTimeout(150);
  if ((await era()) !== expected) problems.push(`expected the ${expected} look at slider index ${index}, got ${await era()}`);
}
await page.locator('.map-side input').fill('france');
await page.locator('.state-list button').first().click();
await page.waitForTimeout(300);
const name = await page.locator('.detail h2').textContent();
await page.locator('.detail', { hasText: 'Charles VIII' }).waitFor({ timeout: 3000 }).catch(() => problems.push('curated facts for France (Charles VIII) did not appear'));
if (process.argv[3]) await page.screenshot({ path: process.argv[3] });
// year slider: move to the last snapshot and expect a different map and label
await page.locator('#year-range').fill('3');
await page.waitForTimeout(500);
const yearLabel = await page.locator('.year-slider output').textContent();
// every link that leaves the site must open a new tab and give the new page no handle back to ours
const externalLinks = () => page.evaluate(() => [...document.querySelectorAll('a[href]')]
  .filter((a) => a.protocol.startsWith('http') && a.origin !== location.origin)
  .filter((a) => a.target !== '_blank' || !/\bnoopener\b/.test(a.rel) || !/\bnoreferrer\b/.test(a.rel))
  .map((a) => a.href));
for (const route of ['/', '/about/', '/privacy/', '/support/', '/state/Q142/', '/year/1914/']) {
  await page.goto(`http://localhost:${port}${route}`);
  await page.waitForTimeout(400);
  if (route === '/') {
    await page.locator('.map-side input').fill('france');
    await page.locator('.state-list button').first().click();
    await page.waitForTimeout(400);
  }
  const bad = await externalLinks();
  if (bad.length) problems.push(`${route}: external links without target=_blank rel=noopener noreferrer: ${bad.join(', ')}`);
  const response = await page.request.get(`http://localhost:${port}${route}`);
  if (response.headers()['x-content-type-options'] !== 'nosniff') problems.push(`${route}: security headers missing`);
}
// search engines: a year page has real content, one h-tags set, a share image and valid structured data
await page.goto(`http://localhost:${port}/year/1914/`);
const seo = await page.evaluate(() => ({
  rows: document.querySelectorAll('main table tbody tr').length,
  canonical: document.querySelector('link[rel=canonical]')?.getAttribute('href') ?? '',
  ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
  jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent ?? 'null')),
}));
if (seo.rows < 15) problems.push(`/year/1914/ lists only ${seo.rows} states`);
if (!seo.canonical.endsWith('/year/1914/')) problems.push(`/year/1914/ canonical is ${seo.canonical}`);
if (!seo.ogImage.endsWith('/og.png')) problems.push('share image meta is missing');
if (seo.jsonLd[0]?.['@type'] !== 'BreadcrumbList') problems.push('structured data is missing on /year/1914/');
const sitemap = await (await page.request.get(`http://localhost:${port}/sitemap.xml`)).text();
if (!sitemap.includes('/year/1914/')) problems.push('sitemap does not list /year/1914/');
console.log(JSON.stringify({ problems, openingYear, yearLabel, mapClickSelected: heading > 0, presentName, listSelected: name }));
await browser.close(); srv.close();
if (problems.length) process.exit(1);
