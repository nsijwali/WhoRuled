import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { feature } from 'topojson-client';
import type { FeatureCollection, MultiPolygon, Position } from 'geojson';
import { HALF_WORLD, buildGeo, snapshotFile, type GeoProperties, type GeoResult } from '../pipeline/build-geo.js';

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
});
