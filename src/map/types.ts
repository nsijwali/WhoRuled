/** A border polygon set for one polity-as-drawn, in projected Web Mercator metres (y down). */
export interface BorderFeature {
  /** Index assigned by the geometry pipeline; stable within one snapshot only. */
  readonly fid: number;
  /** Null for the ~30% of source features with no name (unclaimed or unattributed land). */
  readonly name: string | null;
  /** Source border precision (1-3) or null when the source has none. */
  readonly precision: number | null;
  /** [minX, minY, maxX, maxY] in projected metres. */
  readonly bbox: readonly [number, number, number, number];
  readonly path: Path2D;
}

export interface ViewTransform {
  readonly k: number;
  readonly x: number;
  readonly y: number;
}
