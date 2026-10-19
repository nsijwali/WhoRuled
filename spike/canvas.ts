import { geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { FeatureCollection, MultiPolygon } from 'geojson';

const W = 1200, H = 700;
const canvas = document.getElementById('c') as HTMLCanvasElement;
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d')!;
const topo = (await (await fetch('data/world.topojson')).json()) as Topology;
const fc = feature(topo, Object.values(topo.objects)[0]!) as unknown as FeatureCollection<MultiPolygon>;
const t0 = performance.now();
const paths = fc.features.map((f) => { const p = new Path2D(); geoPath(null, p as unknown as CanvasRenderingContext2D)(f); return p; });
const build = performance.now() - t0;
// data extent is the Mercator square 0..S (y-down); fit to canvas
const S = 40075016.7; const base = H / S;
function draw(k: number, x: number, y: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.setTransform(base * k, 0, 0, base * k, x, y);
  ctx.lineWidth = 1 / (base * k); ctx.strokeStyle = '#444'; ctx.fillStyle = '#d9c9a3';
  for (const p of paths) { ctx.fill(p, 'evenodd'); ctx.stroke(p); }
}
(window as any).run = async () => {
  const times: number[] = [];
  for (let i = 0; i < 90; i++) {
    const k = 1 + (i % 30) / 3; // zoom 1..11
    const s = performance.now();
    draw(k, -i * 7, -i * 4); ctx.getImageData(0, 0, 1, 1); // force flush
    times.push(performance.now() - s);
    await new Promise((r) => requestAnimationFrame(r));
  }
  times.sort((a, b) => a - b);
  return { features: paths.length, buildMs: build, median: times[45]!, p95: times[85]!, max: times[89]! };
};
(window as any).ready = true;
