import type { ViewTransform } from './types';

/** Half the Web Mercator world width in metres; projected coordinates lie in [-HALF_WORLD, HALF_WORLD]. */
export const HALF_WORLD = 20037508.342789244;

export type Bbox = readonly [number, number, number, number];

/** Projected y (metres, y down) of 83°N and 58°S: the band where states have ever been drawn. */
export const VIEW_NORTH = -17821912;
export const VIEW_SOUTH = 7967318;

/** Scale that fits the full width and the inhabited band (not the polar wastes) into the viewport at k = 1. */
export function baseScale(width: number, height: number): number {
  return Math.min(width / (2 * HALF_WORLD), height / (VIEW_SOUTH - VIEW_NORTH));
}

/**
 * The starting view: the inhabited band centred and filling the height. On tall, narrow screens that means
 * zooming in a little and cropping the sides rather than showing empty sea and ice above and below.
 */
export function homeView(width: number, height: number): ViewTransform {
  const base = baseScale(width, height);
  const k = Math.max(1, height / ((VIEW_SOUTH - VIEW_NORTH) * base));
  const centre = (VIEW_NORTH + VIEW_SOUTH) / 2;
  return { k, x: width / 2 - k * (width / 2), y: height / 2 - k * (centre * base + height / 2) };
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
