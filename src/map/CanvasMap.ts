import { baseScale, bboxContains, screenToWorld } from './geometry';
import { realmColour } from './palette';
import type { BorderFeature, ViewTransform } from './types';

const OCEAN_A = '#1a2a9a';
const OCEAN_B = '#2538b8';
const WILD_A = '#b8b8b8';
const WILD_B = '#8c8c8c';
const INK = '#0b0b1a';
const SELECT = '#ffff55';

/** A two-colour dither tile, `cell` device pixels per square, the look of a 16-colour screen. */
function ditherTile(a: string, b: string, cell: number, diagonal: boolean): HTMLCanvasElement {
  const tile = document.createElement('canvas');
  tile.width = tile.height = cell * 2;
  const c = tile.getContext('2d');
  if (!c) return tile;
  c.fillStyle = a;
  c.fillRect(0, 0, tile.width, tile.height);
  c.fillStyle = b;
  if (diagonal) {
    c.fillRect(0, 0, cell, cell);
    c.fillRect(cell, cell, cell, cell);
  } else {
    c.fillRect(cell, 0, cell, tile.height);
  }
  return tile;
}

/** Draws cached border paths and answers point queries. Owns no DOM events. */
export class CanvasMap {
  private width = 0;
  private height = 0;
  private dpr = 1;
  private oceanPattern: CanvasPattern | null = null;
  private wildPattern: CanvasPattern | null = null;
  private readonly hitCtx: CanvasRenderingContext2D;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly colours: (string | null)[];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly features: readonly BorderFeature[],
  ) {
    const ctx = canvas.getContext('2d');
    const hit = document.createElement('canvas').getContext('2d');
    if (!ctx || !hit) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
    this.hitCtx = hit;
    this.colours = features.map((f) => realmColour(f.name, f.overlord));
  }

  get size(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /** Resizes the backing store; call from a ResizeObserver. */
  resize(width: number, height: number, dpr: number): void {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    const cell = Math.max(1, Math.round(dpr * 2));
    this.oceanPattern = this.ctx.createPattern(ditherTile(OCEAN_A, OCEAN_B, cell, true), 'repeat');
    this.wildPattern = this.ctx.createPattern(ditherTile(WILD_A, WILD_B, cell, false), 'repeat');
  }

  /** `phase` animates the dashes around the selected state; 0 draws them still. */
  draw(view: ViewTransform, selectedFid: number | null, hoverFid: number | null = null, phase = 0): void {
    const { ctx, width, height, dpr } = this;
    const base = baseScale(width, height);
    const s = base * view.k;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this.oceanPattern ?? OCEAN_A;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(
      dpr * s, 0, 0, dpr * s,
      dpr * (view.k * (width / 2) + view.x),
      dpr * (view.k * (height / 2) + view.y),
    );
    ctx.lineWidth = 1 / s; // 1 CSS px at any zoom (transform already includes dpr)
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';
    let selected: BorderFeature | undefined;
    let hovered: BorderFeature | undefined;
    this.features.forEach((f, i) => {
      if (f.fid === selectedFid) selected = f;
      if (f.fid === hoverFid) hovered = f;
      ctx.fillStyle = this.colours[i] ?? this.wildPattern ?? WILD_A;
      ctx.fill(f.path, 'evenodd');
      ctx.stroke(f.path);
    });
    if (hovered && hovered !== selected) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill(hovered.path, 'evenodd');
    }
    if (selected) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill(selected.path, 'evenodd');
      const unit = 1 / s;
      ctx.lineWidth = 3 * unit;
      ctx.strokeStyle = INK;
      ctx.stroke(selected.path);
      ctx.lineWidth = 2 * unit;
      ctx.strokeStyle = SELECT;
      ctx.setLineDash([6 * unit, 4 * unit]);
      ctx.lineDashOffset = -phase * unit;
      ctx.stroke(selected.path);
      ctx.setLineDash([]);
    }
  }

  /** The topmost feature under a screen point (CSS pixels), or undefined. */
  hitTest(px: number, py: number, view: ViewTransform): BorderFeature | undefined {
    const base = baseScale(this.width, this.height);
    const [wx, wy] = screenToWorld(px, py, view, base, this.width, this.height);
    for (let i = this.features.length - 1; i >= 0; i--) {
      const f = this.features[i];
      if (f && bboxContains(f.bbox, wx, wy) && this.hitCtx.isPointInPath(f.path, wx, wy, 'evenodd')) return f;
    }
    return undefined;
  }
}
