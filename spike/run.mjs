import { chromium } from 'playwright-core';
import http from 'node:http'; import { readFileSync, existsSync } from 'node:fs'; import path from 'node:path';
const root = path.resolve('out');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.geojson': 'application/json', '.topojson': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(root, q.url.split('?')[0]); if (!existsSync(f)) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', types[path.extname(f)] ?? 'application/octet-stream'); r.end(readFileSync(f)); }).listen(0);
const port = srv.address().port;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [name, page_] of [['canvas', 'index-canvas.html'], ['maplibre', 'index-maplibre.html']]) {
  for (const cpu of [1, 4]) {
    const p = await b.newPage({ viewport: { width: 1200, height: 700 } });
    p.on('pageerror', (e) => console.log(name, 'pageerror', e.message));
    const c = await p.context().newCDPSession(p);
    await c.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    await p.goto(`http://localhost:${port}/${page_}`);
    try { await p.waitForFunction('window.ready === true', null, { timeout: 60000 }); console.log(name, `cpu${cpu}x`, JSON.stringify(await p.evaluate('window.run()'))); } catch (e) { console.log(name, cpu, 'FAIL', e.message.slice(0, 200)); }
    await p.close();
  }
}
await b.close(); srv.close();
