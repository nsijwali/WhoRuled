import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import mapshaper from 'mapshaper';
import { quantize } from 'topojson-client';
import { topology } from 'topojson-server';
import type { Topology } from 'topojson-specification';
import { z } from 'zod';

/** Web Mercator is a square at this latitude; the data is clipped to it (ADR-003). */
export const MAX_LATITUDE = 85.0511;
/** Half the width of the projected world in metres (Web Mercator, EPSG:3857). */
export const HALF_WORLD = 20037508.342789244;

const SourceProperties = z.object({
  NAME: z.string().nullable(),
  BORDERPRECISION: z.number().nullable().optional(),
});

const SourceCollection = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.object({
      type: z.literal('Feature'),
      properties: SourceProperties.passthrough(),
      geometry: z.object({ type: z.string() }).passthrough().nullable(),
    }),
  ),
});

export interface GeoProperties {
  /** Numeric feature id, unique within one snapshot. */
  fid: number;
  name: string | null;
  /** Source BORDERPRECISION (1 = approximate); null when absent. */
  precision: number | null;
}

export interface BuildOptions {
  /** Percentage of vertices to keep when simplifying (mapshaper `NN%`). */
  simplifyPercent: number;
  /** TopoJSON quantisation grid size. */
  quantization: number;
}

export const DEFAULT_OPTIONS: BuildOptions = { simplifyPercent: 20, quantization: 100_000 };

export interface GeoStats {
  sourceFeatures: number;
  features: number;
  bytes: number;
  gzipBytes: number;
}

export interface GeoResult {
  topology: Topology;
  json: string;
  stats: GeoStats;
}


function flipY(coords: unknown): unknown {
  if (Array.isArray(coords) && typeof coords[0] === 'number') {
    const [x, y, ...rest] = coords as Position;
    return [x, -(y as number), ...rest];
  }
  return (coords as unknown[]).map(flipY);
}

/**
 * Clip to the Mercator latitude limits, project to Web Mercator, simplify, flip y so it
 * points down, and emit quantised TopoJSON. The raw source is never modified.
 */
export async function buildGeo(
  rawGeoJson: unknown,
  options: BuildOptions = DEFAULT_OPTIONS,
): Promise<GeoResult> {
  const source = SourceCollection.parse(rawGeoJson);
  const commands = [
    '-i in.json',
    `-clip bbox=-180,-${MAX_LATITUDE},180,${MAX_LATITUDE}`,
    '-proj webmercator',
    `-simplify visvalingam ${options.simplifyPercent}% keep-shapes`,
    '-o out.json format=geojson',
  ].join(' ');
  const output = await mapshaper.applyCommands(commands, { 'in.json': rawGeoJson });
  const out = output['out.json'];
  if (out === undefined) throw new Error('mapshaper produced no output');
  const projected = JSON.parse(
    typeof out === 'string' ? out : Buffer.from(out).toString('utf8'),
  ) as FeatureCollection<Polygon | MultiPolygon, Record<string, unknown>>;

  const features: Feature<MultiPolygon, GeoProperties>[] = projected.features.map((f, fid) => {
    const props = SourceProperties.passthrough().parse(f.properties);
    return {
      type: 'Feature',
      properties: { fid, name: props.NAME, precision: props.BORDERPRECISION ?? null },
      geometry: {
        type: 'MultiPolygon',
        // mapshaper writes single-part shapes as Polygon; normalise to MultiPolygon.
        coordinates: flipY(
          f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates,
        ) as MultiPolygon['coordinates'],
      },
    };
  });

  const collection: FeatureCollection<MultiPolygon, GeoProperties> = { type: 'FeatureCollection', features };
  const exact = topology({ borders: collection });
  const topo = quantize(exact as unknown as Parameters<typeof quantize>[0], options.quantization);
  const json = JSON.stringify(topo);
  return {
    topology: topo,
    json,
    stats: {
      sourceFeatures: source.features.length,
      features: features.length,
      bytes: Buffer.byteLength(json),
      gzipBytes: gzipSync(json).length,
    },
  };
}

/** Writes `geo/<year>.<hash>.topojson` and updates manifest.json in outDir. */
export function writeGeo(outDir: string, year: number, result: GeoResult): string {
  const hash = createHash('sha256').update(result.json).digest('hex').slice(0, 8);
  const file = `geo/${year}.${hash}.topojson`;
  mkdirSync(join(outDir, 'geo'), { recursive: true });
  writeFileSync(join(outDir, file), result.json);
  const manifestPath = join(outDir, 'manifest.json');
  let manifest: { geo: Record<string, { file: string; features: number; bytes: number }> };
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    manifest = { geo: {} };
  }
  manifest.geo[String(year)] = {
    file,
    features: result.stats.features,
    bytes: result.stats.bytes,
  };
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return file;
}

/** Source file name for a snapshot year; BC years use the upstream `bc<N>` spelling. */
export function snapshotFile(year: number): string {
  return `data/borders-gpl/world_${year < 0 ? `bc${-year}` : year}.geojson`;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const percent = Number(process.argv[3] ?? DEFAULT_OPTIONS.simplifyPercent);
  const years: number[] =
    process.argv[2] !== undefined
      ? [Number(process.argv[2])]
      : (JSON.parse(readFileSync('data/years.json', 'utf8')) as number[]);
  for (const year of years) {
    const raw: unknown = JSON.parse(readFileSync(snapshotFile(year), 'utf8'));
    const result = await buildGeo(raw, { ...DEFAULT_OPTIONS, simplifyPercent: percent });
    const file = writeGeo('public/data', year, result);
    console.log(JSON.stringify({ year, percent, file, ...result.stats }));
  }
}
