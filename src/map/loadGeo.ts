import { geoPath } from 'd3-geo';
import type { MultiPolygon, Polygon } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { z } from 'zod';
import type { BorderFeature } from './types';

const Manifest = z.object({
  geo: z.record(z.string(), z.object({ file: z.string(), features: z.number().int() })),
});

const FeatureProps = z.object({
  fid: z.number().int(),
  name: z.string().nullable(),
  precision: z.number().nullable(),
  overlord: z.string().nullable().default(null),
});

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
  return res.json();
}

function bboxOf(multi: MultiPolygon): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const polygon of multi.coordinates)
    for (const ring of polygon)
      for (const [x, y] of ring) {
        if (x === undefined || y === undefined) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  return [minX, minY, maxX, maxY];
}

const planar = geoPath(null);
const EARTH_RADIUS = 6378137;

/** The label anchor of a state: the centroid of its largest polygon, with that polygon's width. */
function labelOf(multi: MultiPolygon): { area: number; label: BorderFeature['label'] } {
  let total = 0;
  let best: Polygon | null = null;
  let bestArea = 0;
  for (const coordinates of multi.coordinates) {
    const polygon: Polygon = { type: 'Polygon', coordinates };
    const a = Math.abs(planar.area(polygon));
    total += a;
    if (a > bestArea) {
      bestArea = a;
      best = polygon;
    }
  }
  const [[, y0], [, y1]] = planar.bounds(multi);
  const [x, y] = best ? planar.centroid(best) : [NaN, NaN];
  // Mercator inflates areas by cosh²(northing / R); undo it so Siberia does not outrank China.
  const stretch = Math.cosh(((y0 + y1) / 2) / EARTH_RADIUS) ** 2;
  const area = total / stretch;
  if (!best || !Number.isFinite(x) || !Number.isFinite(y)) return { area, label: null };
  const [[bx0], [bx1]] = planar.bounds(best);
  return { area, label: { x, y, width: bx1 - bx0 } };
}

/** The snapshot years available in the manifest, ascending. */
export async function loadYears(baseUrl = '/data/'): Promise<number[]> {
  const manifest = Manifest.parse(await fetchJson(`${baseUrl}manifest.json`));
  return Object.keys(manifest.geo)
    .map(Number)
    .sort((a, b) => a - b);
}

/** Loads the border snapshot for `year` and builds one cached Path2D per feature. */
export async function loadBorders(year: number, baseUrl = '/data/'): Promise<BorderFeature[]> {
  const manifest = Manifest.parse(await fetchJson(`${baseUrl}manifest.json`));
  const entry = manifest.geo[String(year)];
  if (!entry) throw new Error(`No border snapshot for year ${year}`);
  const topo = (await fetchJson(`${baseUrl}${entry.file}`)) as Topology;
  const object = topo.objects['borders'] as GeometryCollection | undefined;
  if (!object) throw new Error('Snapshot is missing the "borders" object');
  const collection = feature(topo, object);

  const out: BorderFeature[] = [];
  for (const f of collection.features) {
    if (f.geometry.type !== 'MultiPolygon') continue;
    const props = FeatureProps.parse(f.properties);
    const path = new Path2D();
    geoPath(null, path as unknown as CanvasRenderingContext2D)(f.geometry);
    out.push({ fid: props.fid, name: props.name, precision: props.precision, overlord: props.overlord, bbox: bboxOf(f.geometry), path, ...labelOf(f.geometry) });
  }
  return out;
}
