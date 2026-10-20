import { describe, expect, it } from 'vitest';
import { HALF_WORLD, VIEW_NORTH, VIEW_SOUTH, baseScale, bboxContains, homeView, screenToWorld, viewForBbox } from './geometry';

describe('geometry', () => {
  const W = 1000;
  const H = 600;
  const base = baseScale(W, H);

  it('fits the inhabited band to the viewport without overflowing either side', () => {
    expect(base * (VIEW_SOUTH - VIEW_NORTH)).toBeLessThanOrEqual(H + 1e-9);
    expect(base * 2 * HALF_WORLD).toBeLessThanOrEqual(W + 1e-9);
    expect(Math.max(base * (VIEW_SOUTH - VIEW_NORTH) - H, base * 2 * HALF_WORLD - W)).toBeCloseTo(0);
  });

  it('centres the inhabited band in the home view', () => {
    const v = homeView(W, H);
    const [, top] = screenToWorld(W / 2, H / 2 - (base * (VIEW_SOUTH - VIEW_NORTH)) / 2, v, base, W, H);
    expect(top).toBeCloseTo(VIEW_NORTH, -1);
  });

  it('zooms in on tall screens so the band fills the height', () => {
    const v = homeView(390, 400);
    const b = baseScale(390, 400);
    expect(v.k).toBeGreaterThan(1);
    const [, top] = screenToWorld(195, 0, v, b, 390, 400);
    const [, bottom] = screenToWorld(195, 400, v, b, 390, 400);
    expect(top).toBeCloseTo(VIEW_NORTH, -1);
    expect(bottom).toBeCloseTo(VIEW_SOUTH, -1);
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
