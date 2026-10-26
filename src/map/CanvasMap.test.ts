import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasMap } from './CanvasMap';
import type { BorderFeature } from './types';

/** Minimal 2D context: CanvasMap only needs these members in a node test environment. */
function stubContext(): Record<string, unknown> {
  return {
    isPointInPath: () => true,
    createPattern: () => ({}),
    drawImage: () => undefined,
    fillRect: () => undefined,
  };
}

function stubCanvas(width: number, height: number): HTMLCanvasElement {
  return { width, height, getContext: () => stubContext() } as unknown as HTMLCanvasElement;
}

function feature(fid: number, name: string): BorderFeature {
  return {
    fid,
    name,
    overlord: null,
    area: 100,
    label: { x: 0, y: 0 },
    path: {},
    bbox: [0, 0, 1, 1],
    precision: 0,
  } as unknown as BorderFeature;
}

describe('CanvasMap.setFeatures', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { createElement: () => stubCanvas(0, 0) });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is a no-op for the same feature array, so a re-render cannot start a dissolve', () => {
    const features = [feature(1, 'Alpha')];
    const map = new CanvasMap(stubCanvas(10, 10), features);
    map.setFeatures(features, true);
    expect(map.dissolving).toBe(false);
  });

  it('starts a dissolve from the previous picture when a new snapshot arrives and motion is allowed', () => {
    const map = new CanvasMap(stubCanvas(10, 10), [feature(1, 'Alpha')]);
    map.setFeatures([feature(2, 'Beta')], true);
    expect(map.dissolving).toBe(true);
  });

  it('swaps snapshots without a dissolve when motion is reduced', () => {
    const map = new CanvasMap(stubCanvas(10, 10), [feature(1, 'Alpha')]);
    map.setFeatures([feature(2, 'Beta')], false);
    expect(map.dissolving).toBe(false);
  });
});
