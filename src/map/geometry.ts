import type { ViewTransform } from './types';

/** Half the Web Mercator world width in metres; projected coordinates lie in [-HALF_WORLD, HALF_WORLD]. */
export const HALF_WORLD = 20037508.342789244;

export type Bbox = readonly [number, number, number, number];

/** Scale that fits the whole projected square into a viewport of the given size (k = 1). */
export function baseScale(width: number, height: number): number {
  return Math.min(width, height) / (2 * HALF_WORLD);
}

/**
 * View convention (matches d3-zoom): with base-space point q = world * base + (width/2, height/2),
 * screen = k * q + (x, y).
 */
export function screenToWorld(
  px: number,
  py: number,
  view: ViewTransform,
  base: number,
  width: number,
  height: number,
): [number, number] {
  return [((px - view.x) / view.k - width / 2) / base, ((py - view.y) / view.k - height / 2) / base];
}

export function bboxContains(b: Bbox, x: number, y: number): boolean {
  return x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
}

/** The view that centres `bbox` and fits it into the viewport with `padding` (0..1 of the viewport). */
export function viewForBbox(
  bbox: Bbox,
  width: number,
  height: number,
  maxZoom: number,
  padding = 0.8,
): ViewTransform {
  const base = baseScale(width, height);
  const w = Math.max(bbox[2] - bbox[0], 1);
  const h = Math.max(bbox[3] - bbox[1], 1);
  const k = Math.min(maxZoom, Math.max(1, (padding * Math.min(width / w, height / h)) / base));
  const qx = ((bbox[0] + bbox[2]) / 2) * base + width / 2;
  const qy = ((bbox[1] + bbox[3]) / 2) * base + height / 2;
  return { k, x: width / 2 - k * qx, y: height / 2 - k * qy };
}
