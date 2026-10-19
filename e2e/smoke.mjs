import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.topojson': 'application/json' };
const srv = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (existsSync(f) && statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!existsSync(f)) { r.statusCode = 404; return r.end(); }
  r.setHeader('content-type', types[path.extname(f)] ?? 'application/octet-stream');
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
const name = await page.locator('.detail h2').textContent();
if (process.argv[3]) await page.screenshot({ path: process.argv[3] });
// year slider: move to the last snapshot and expect a different map and label
await page.locator('#year-range').fill('3');
await page.waitForTimeout(500);
const yearLabel = await page.locator('.year-slider output').textContent();
console.log(JSON.stringify({ problems, yearLabel, mapClickSelected: heading > 0, listSelected: name }));
await browser.close(); srv.close();
if (problems.length) process.exit(1);
