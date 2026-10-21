import { baseScale, bboxContains, screenToWorld } from './geometry';
import { realmFill, type RealmFill } from './palette';
import { mixTile, themeOf, type EraTheme, type TileSpec } from './theme';
import type { BorderFeature, ViewTransform } from './types';

const LABEL_MIN_AREA = 900; // true-area CSS px² a state must cover on screen before it gets a name
const MAX_LABELS = 80;

/** 4×4 ordered-dither thresholds; revealing cells in this order gives the classic dissolve. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Builds a tile from rows of characters, one character per `cell` device pixels; unknown keys stay transparent. */
function tile(rows: readonly string[], colours: Record<string, string>, cell: number): HTMLCanvasElement {
  const t = document.createElement('canvas');
  t.width = (rows[0]?.length ?? 1) * cell;
  t.height = rows.length * cell;
  const c = t.getContext('2d');
  if (!c) return t;
  rows.forEach((row, y) => {
    [...row].forEach((key, x) => {
      const colour = colours[key];
      if (!colour) return;
      c.fillStyle = colour;
      c.fillRect(x * cell, y * cell, cell, cell);
    });
  });
  return t;
}

export interface DrawOptions {
  /** Animates the dashes around the selected state; 0 draws them still. */
  phase?: number;
  /** 0..1 progress of the dissolve from the previous snapshot; 1 (default) shows only the new one. */
  dissolve?: number;
}

/** Draws cached border paths and answers point queries. Owns no DOM events. */
export class CanvasMap {
  private width = 0;
  private height = 0;
  private dpr = 1;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly hitCtx: CanvasRenderingContext2D;
  private fills: (RealmFill | null)[];
  private readonly patterns = new Map<RealmFill, CanvasPattern | string>();
  private ocean: CanvasPattern | string = '#000000';
  private wild: CanvasPattern | string = '#808080';
  private glint: CanvasPattern | string = 'rgba(255,255,255,0.4)';
  private dissolveSteps: (CanvasPattern | null)[] = [];
  /** Indices of named features that can carry a label, largest first. */
  private readonly labelOrder: number[];
  private readonly textWidth = new Map<string, number>();
  private ghost: HTMLCanvasElement | null = null;
  private scratch: HTMLCanvasElement | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly features: readonly BorderFeature[],
    /** Keep what the canvas shows now, to dissolve from it into this snapshot. */
    keepPrevious = false,
    private theme: EraTheme = themeOf(Number.POSITIVE_INFINITY),
  ) {
    const ctx = canvas.getContext('2d');
    const hit = document.createElement('canvas').getContext('2d');
    if (!ctx || !hit) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
    this.hitCtx = hit;
    this.fills = features.map((f) => realmFill(f.name, f.overlord, theme.map.realms));
    this.labelOrder = features
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => f.name !== null && f.label !== null && hit.isPointInPath(f.path, f.label.x, f.label.y, 'evenodd'))
      .sort((p, q) => q.f.area - p.f.area)
      .map(({ i }) => i);
    if (keepPrevious) this.captureGhost();
  }

  /** Keeps what the canvas shows now, to dissolve from it into whatever is drawn next. */
  captureGhost(): void {
    const { canvas } = this;
    if (canvas.width === 0 || canvas.height === 0) return;
    const ghost = document.createElement('canvas');
    ghost.width = canvas.width;
    ghost.height = canvas.height;
    ghost.getContext('2d')?.drawImage(canvas, 0, 0);
    this.ghost = ghost;
  }

  get currentTheme(): EraTheme {
    return this.theme;
  }

  /** Re-dresses the map in another era's look; call `draw` afterwards. */
  setTheme(theme: EraTheme): void {
    if (theme === this.theme) return;
    this.theme = theme;
    this.textWidth.clear();
    this.fills = this.features.map((f) => realmFill(f.name, f.overlord, theme.map.realms));
    if (this.width > 0) this.buildPatterns();
  }

  get size(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  get dissolving(): boolean {
    return this.ghost !== null;
  }

  /** Drops the previous snapshot once the dissolve is over. */
  endDissolve(): void {
    this.ghost = null;
    this.scratch = null;
  }

  /** Resizes the backing store; call from a ResizeObserver. */
  resize(width: number, height: number, dpr: number): void {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.buildPatterns();
    this.scratch = null;
  }

  /** Builds the dither patterns for the current theme; they are pinned to screen pixels, so they depend on the DPR. */
  private buildPatterns(): void {
    const { map } = this.theme;
    const px = Math.max(1, Math.round(this.dpr)); // one screen pixel of the pixel-art look
    const make = (t: HTMLCanvasElement) => this.ctx.createPattern(t, 'repeat');
    const build = (spec: TileSpec) => make(tile(spec.rows, spec.colours, px * spec.cell));
    const oceanColour = map.ocean.colours['o'] ?? '#000000';
    const wildColour = map.wild.colours['g'] ?? '#808080';
    this.ocean = build(map.ocean) ?? oceanColour;
    this.wild = build(map.wild) ?? wildColour;
    this.glint = make(tile(['ab', 'ba'], { a: map.glint }, px)) ?? this.glint;
    this.patterns.clear();
    for (const fill of new Set(this.fills)) {
      if (!fill) continue;
      this.patterns.set(fill, fill.a === fill.b ? fill.a : (build(mixTile(this.theme, fill)) ?? fill.a));
    }
    const cell = px * 2;
    this.dissolveSteps = Array.from({ length: 17 }, (_, level) =>
      make(tile(
        [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => ((BAYER[r * 4 + c] ?? 0) < level ? 'x' : '.')).join('')),
        { x: '#000000' },
        cell,
      )),
    );
  }

  draw(view: ViewTransform, selectedFid: number | null, hoverFid: number | null = null, options: DrawOptions = {}): void {
    const { ctx, width, height, dpr } = this;
    const { phase = 0, dissolve = 1 } = options;
    const base = baseScale(width, height);
    const s = base * view.k;
    const a = dpr * s;
    const e = dpr * (view.k * (width / 2) + view.x);
    const f = dpr * (view.k * (height / 2) + view.y);
    // Patterns are filled in world space; this pins every dither to screen pixels so it never shimmers or scales.
    const screen = new DOMMatrix([1 / a, 0, 0, 1 / a, -e / a, -f / a]);
    for (const p of [...this.patterns.values(), this.wild, this.glint]) if (typeof p !== 'string') p.setTransform(screen);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this.ocean;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(a, 0, 0, a, e, f);
    ctx.lineWidth = this.theme.map.outlineWidth / s; // CSS px at any zoom (transform already includes dpr)
    ctx.strokeStyle = this.theme.map.outline;
    ctx.lineJoin = 'round';
    let selected: BorderFeature | undefined;
    let hovered: BorderFeature | undefined;
    this.features.forEach((feature, i) => {
      if (feature.fid === selectedFid) selected = feature;
      if (feature.fid === hoverFid) hovered = feature;
      const fill = this.fills[i];
      ctx.fillStyle = (fill && this.patterns.get(fill)) ?? this.wild;
      ctx.fill(feature.path, 'evenodd');
      ctx.stroke(feature.path);
    });
    if (hovered && hovered !== selected) {
      ctx.fillStyle = this.glint;
      ctx.fill(hovered.path, 'evenodd');
    }
    if (selected) {
      const unit = 1 / s;
      ctx.lineWidth = 3 * unit;
      ctx.strokeStyle = this.theme.map.outline;
      ctx.stroke(selected.path);
      ctx.lineWidth = 2 * unit;
      ctx.strokeStyle = this.theme.map.selection;
      ctx.setLineDash([6 * unit, 4 * unit]);
      ctx.lineDashOffset = -phase * unit;
      ctx.stroke(selected.path);
      ctx.setLineDash([]);
    }
    this.drawLabels(s, e / dpr, f / dpr);
    if (this.ghost && dissolve < 1) this.drawGhost(dissolve);
  }

  /** Names the largest states that have room for them, biggest first, never overlapping. */
  private drawLabels(s: number, ox: number, oy: number): void {
    const { ctx, dpr } = this;
    const { labelFont, labelFill, labelHalo } = this.theme.map;
    if (typeof document !== 'undefined' && !document.fonts.check(labelFont)) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = labelFont;
    ctx.textBaseline = 'middle';
    const placed: [number, number, number, number][] = [];
    for (const i of this.labelOrder) {
      const feature = this.features[i];
      if (!feature?.label || !feature.name) continue;
      if (feature.area * s * s < LABEL_MIN_AREA) break; // sorted by area, so the rest are smaller still
      let w = this.textWidth.get(feature.name);
      if (w === undefined) {
        w = ctx.measureText(feature.name).width;
        this.textWidth.set(feature.name, w);
      }
      if (w + 6 > feature.label.width * s) continue;
      const x = Math.round(feature.label.x * s + ox - w / 2);
      const y = Math.round(feature.label.y * s + oy);
      if (x < 2 || y < 8 || x + w > this.width - 2 || y > this.height - 8) continue;
      const box: [number, number, number, number] = [x - 4, y - 10, x + w + 4, y + 10];
      if (placed.some((b) => b[0] < box[2] && box[0] < b[2] && b[1] < box[3] && box[1] < b[3])) continue;
      placed.push(box);
      ctx.fillStyle = labelHalo;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [2, 2]] as const) ctx.fillText(feature.name, x + dx, y + dy);
      ctx.fillStyle = labelFill;
      ctx.fillText(feature.name, x, y);
      if (placed.length >= MAX_LABELS) break;
    }
  }

  /** Lays the previous snapshot over this one with ordered-dither holes punched in it: a 16-colour dissolve. */
  private drawGhost(progress: number): void {
    const { ctx, canvas } = this;
    const ghost = this.ghost;
    const mask = this.dissolveSteps[Math.min(16, Math.max(0, Math.round(progress * 16)))];
    if (!ghost || mask === undefined) return;
    if (!this.scratch || this.scratch.width !== canvas.width || this.scratch.height !== canvas.height) {
      this.scratch = document.createElement('canvas');
      this.scratch.width = canvas.width;
      this.scratch.height = canvas.height;
    }
    const sc = this.scratch.getContext('2d');
    if (!sc) return;
    sc.globalCompositeOperation = 'copy';
    sc.drawImage(ghost, 0, 0);
    if (mask) {
      sc.globalCompositeOperation = 'destination-out';
      sc.fillStyle = mask;
      sc.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.scratch, 0, 0);
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
