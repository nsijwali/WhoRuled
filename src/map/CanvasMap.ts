import { baseScale, bboxContains, screenToWorld } from './geometry';
import type { BorderFeature, ViewTransform } from './types';

const FILL = '#d9c9a3';
const FILL_SELECTED = '#c2522b';
const STROKE = '#5b4e36';

/** Draws cached border paths and answers point queries. Owns no DOM events. */
export class CanvasMap {
  private width = 0;
  private height = 0;
  private dpr = 1;
  private readonly hitCtx: CanvasRenderingContext2D;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly features: readonly BorderFeature[],
  ) {
    const ctx = canvas.getContext('2d');
    const hit = document.createElement('canvas').getContext('2d');
    if (!ctx || !hit) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
    this.hitCtx = hit;
  }

  private readonly ctx: CanvasRenderingContext2D;

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
  }

  draw(view: ViewTransform, selectedFid: number | null): void {
    const { ctx, width, height, dpr } = this;
    const base = baseScale(width, height);
    const s = base * view.k;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(
      dpr * s, 0, 0, dpr * s,
      dpr * (view.k * (width / 2) + view.x),
      dpr * (view.k * (height / 2) + view.y),
    );
    ctx.lineWidth = 1 / s; // 1 CSS px at any zoom (transform already includes dpr)
    ctx.strokeStyle = STROKE;
    ctx.lineJoin = 'round';
    ctx.fillStyle = FILL;
    let selected: BorderFeature | undefined;
    for (const f of this.features) {
      if (f.fid === selectedFid) {
        selected = f;
        continue;
      }
      ctx.fill(f.path, 'evenodd');
      ctx.stroke(f.path);
    }
    if (selected) {
      ctx.fillStyle = FILL_SELECTED;
      ctx.fill(selected.path, 'evenodd');
      ctx.stroke(selected.path);
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
