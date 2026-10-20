import { geoPath } from 'd3-geo';
import type { MultiPolygon } from 'geojson';
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
    out.push({ fid: props.fid, name: props.name, precision: props.precision, overlord: props.overlord, bbox: bboxOf(f.geometry), path });
  }
  return out;
}
