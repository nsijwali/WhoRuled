import { describe, expect, it } from 'vitest';
import { HALF_WORLD, baseScale, bboxContains, screenToWorld, viewForBbox } from './geometry';

describe('geometry', () => {
  const W = 1000;
  const H = 600;
  const base = baseScale(W, H);

  it('fits the world square to the shorter viewport side', () => {
    expect(base * 2 * HALF_WORLD).toBeCloseTo(H);
  });

  it('maps the screen centre to the world origin at the identity view', () => {
    const [x, y] = screenToWorld(W / 2, H / 2, { k: 1, x: 0, y: 0 }, base, W, H);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
  });

  it('inverts a view produced by viewForBbox so the bbox centre lands mid-screen', () => {
    const bbox = [1e6, 2e6, 3e6, 4e6] as const;
    const view = viewForBbox(bbox, W, H, 40);
    const [x, y] = screenToWorld(W / 2, H / 2, view, base, W, H);
    expect(x).toBeCloseTo(2e6, 0);
    expect(y).toBeCloseTo(3e6, 0);
  });

  it('clamps zoom to [1, maxZoom]', () => {
    expect(viewForBbox([0, 0, 1, 1], W, H, 8).k).toBe(8);
    expect(viewForBbox([-HALF_WORLD, -HALF_WORLD, HALF_WORLD, HALF_WORLD], W, H, 8).k).toBe(1);
  });

  it('tests bbox containment inclusively', () => {
    expect(bboxContains([0, 0, 2, 2], 2, 2)).toBe(true);
    expect(bboxContains([0, 0, 2, 2], 2.1, 1)).toBe(false);
  });
});
