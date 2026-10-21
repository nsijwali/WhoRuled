import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { feature } from 'topojson-client';
import type { FeatureCollection, MultiPolygon, Position } from 'geojson';
import {
  HALF_WORLD,
  buildGeo,
  fromNaturalEarth,
  loadSnapshot,
  snapshotFile,
  type GeoProperties,
  type GeoResult,
} from '../pipeline/build-geo.js';

let result: GeoResult;
let fc: FeatureCollection<MultiPolygon, GeoProperties>;

beforeAll(async () => {
  const raw: unknown = JSON.parse(readFileSync('data/borders-gpl/world_1492.geojson', 'utf8'));
  result = await buildGeo(raw);
  fc = feature(result.topology, result.topology.objects.borders as never) as unknown as typeof fc;
}, 60_000);

function* positions(c: unknown): Generator<Position> {
  if (Array.isArray(c) && typeof c[0] === 'number') yield c as Position;
  else for (const x of c as unknown[]) yield* positions(x);
}

describe('buildGeo (1492)', () => {
  it('keeps almost every feature and reports what was dropped', () => {
    expect(result.stats.sourceFeatures).toBe(1946);
    // Features wholly south of the Mercator limit are dropped by the clip.
    expect(result.stats.features).toBeGreaterThan(1900);
    expect(result.stats.sourceFeatures - result.stats.features).toBeLessThan(20);
  });

  it('emits only finite coordinates (regression: single-part shapes arrive as Polygon)', () => {
    let count = 0;
    for (const f of fc.features)
      for (const [x, y] of positions(f.geometry.coordinates)) {
        count++;
        if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`bad coordinate in ${f.properties.name}`);
      }
    expect(count).toBeGreaterThan(50_000);
  });

  it('keeps unnamed features with a null name (consumers must handle them)', () => {
    const unnamed = fc.features.filter((f) => f.properties.name === null);
    expect(unnamed.length).toBeGreaterThan(0);
    for (const f of fc.features) {
      expect(f.properties.name === null || typeof f.properties.name === 'string').toBe(true);
    }
  });

  it('assigns unique numeric fids', () => {
    const fids = fc.features.map((f) => f.properties.fid);
    expect(new Set(fids).size).toBe(fids.length);
    expect(fids.every((n) => Number.isInteger(n))).toBe(true);
  });

  it('stays inside the Mercator square', () => {
    let maxX = 0;
    let maxY = 0;
    for (const f of fc.features)
      for (const [x, y] of positions(f.geometry.coordinates)) {
        maxX = Math.max(maxX, Math.abs(x ?? 0));
        maxY = Math.max(maxY, Math.abs(y ?? 0));
      }
    expect(maxX).toBeLessThanOrEqual(HALF_WORLD * 1.001);
    expect(maxY).toBeLessThanOrEqual(HALF_WORLD * 1.001);
  });

  it('records the overlord only when it differs from the state itself', () => {
    const khanate = fc.features.find((f) => f.properties.name === 'Crimean Khanate');
    expect(khanate?.properties.overlord).toBe('Ottoman Empire');
    const ottoman = fc.features.find((f) => f.properties.name === 'Ottoman Empire');
    expect(ottoman?.properties.overlord).toBeNull();
  });

  it('has y pointing down: Europe is above (smaller y than) South Africa', () => {
    const centroidY = (name: string): number => {
      const f = fc.features.find((x) => x.properties.name === name);
      if (!f) throw new Error(`missing ${name}`);
      const ys = [...positions(f.geometry.coordinates)].map((p) => p[1] as number);
      return ys.reduce((a, b) => a + b, 0) / ys.length;
    };
    const names = new Set(fc.features.map((f) => f.properties.name));
    const north = ['Kingdom of France', 'France', 'England'].find((n) => names.has(n));
    expect(north, 'a northern polity should exist in the 1492 data').toBeDefined();
    const northY = centroidY(north as string);
    const allY = fc.features.flatMap((f) => [...positions(f.geometry.coordinates)].map((p) => p[1] as number));
    expect(northY).toBeLessThan(allY.reduce((a, b) => a + b, 0) / allY.length);
  });

  it('is small enough for the budget (ADR-003/008: under 500 KB gzipped)', () => {
    expect(result.stats.gzipBytes).toBeLessThan(500_000);
  });

  it('rejects input that is not a FeatureCollection', async () => {
    await expect(buildGeo({ type: 'Point' })).rejects.toThrow();
  });
});

describe('snapshotFile', () => {
  it('uses the upstream bc spelling for BC years', () => {
    expect(snapshotFile(-500)).toBe('data/borders-gpl/world_bc500.geojson');
    expect(snapshotFile(1914)).toBe('data/borders-gpl/world_1914.geojson');
  });

  it('takes the present-day snapshot from Natural Earth, outside the GPL folder', () => {
    expect(snapshotFile(2026)).toBe('data/borders-ne/ne_50m_admin_0_countries.geojson');
    expect(snapshotFile(2010)).toBe('data/borders-gpl/world_2010.geojson');
  });
});

describe('buildGeo (2026, Natural Earth)', () => {
  let modern: GeoResult;
  let mfc: FeatureCollection<MultiPolygon, GeoProperties>;

  beforeAll(async () => {
    const { raw, source } = loadSnapshot(2026);
    expect(source).toBe('natural-earth');
    modern = await buildGeo(raw);
    mfc = feature(modern.topology, modern.topology.objects.borders as never) as unknown as typeof mfc;
  }, 60_000);

  const byName = (name: string) => mfc.features.find((f) => f.properties.name === name);

  it('keeps every Natural Earth admin-0 feature with the same output properties as other years', () => {
    expect(modern.stats.sourceFeatures).toBe(242);
    expect(modern.stats.features).toBe(242);
    for (const f of mfc.features) {
      expect(Object.keys(f.properties).sort()).toEqual(['fid', 'name', 'overlord', 'precision']);
      expect(typeof f.properties.name).toBe('string');
      expect(f.properties.precision).toBe(3);
    }
    expect(new Set(mfc.features.map((f) => f.properties.fid)).size).toBe(242);
  });

  it('uses full English names and includes states created after 2010', () => {
    for (const name of ['United States of America', 'Democratic Republic of the Congo', 'South Sudan', 'Kosovo'])
      expect(byName(name), name).toBeDefined();
  });

  it('names an overlord only for dependencies, never for disputed areas', () => {
    expect(byName('Puerto Rico')?.properties.overlord).toBe('United States of America');
    expect(byName('France')?.properties.overlord).toBeNull();
    expect(byName('Palestine')?.properties.overlord).toBeNull();
    expect(byName('Falkland Islands')?.properties.overlord).toBeNull();
  });

  it('stays inside the Mercator square and has no ring wrapping across the antimeridian', () => {
    for (const f of mfc.features)
      for (const polygon of f.geometry.coordinates)
        for (const ring of polygon) {
          const xs = ring.map((p) => p[0] as number);
          const ys = ring.map((p) => p[1] as number);
          expect(Math.max(...xs.map(Math.abs), ...ys.map(Math.abs))).toBeLessThanOrEqual(HALF_WORLD * 1.001);
          // A ring that wrapped round the antimeridian would span almost the whole world. Antarctica
          // legitimately does: it is cut along the antimeridian and closed along the clip edge.
          if (f.properties.name !== 'Antarctica') expect(Math.max(...xs) - Math.min(...xs), f.properties.name ?? '').toBeLessThan(HALF_WORLD);
        }
  });

  it('stays comparable in size to the historical snapshots', () => {
    expect(modern.stats.gzipBytes).toBeLessThan(150_000);
  });

  it('rejects a collection without Natural Earth columns', () => {
    expect(() => fromNaturalEarth({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: null }] })).toThrow();
  });
});
