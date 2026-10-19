import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CanvasMap } from '../map/CanvasMap';
import { HALF_WORLD, baseScale, viewForBbox } from '../map/geometry';
import { loadBorders } from '../map/loadGeo';
import type { BorderFeature, ViewTransform } from '../map/types';

const YEAR = 1492;
const MAX_ZOOM = 64;
const MAX_LIST = 50;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; features: BorderFeature[] };

export default function MapIsland() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    loadBorders(YEAR)
      .then((features) => !cancelled && setState({ status: 'ready', features }))
      .catch((e: unknown) => {
        if (!cancelled) setState({ status: 'error', message: e instanceof Error ? e.message : 'Unknown error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') return <p role="status">Loading map…</p>;
  if (state.status === 'error') return <p role="alert">Could not load the map: {state.message}</p>;
  return <MapView features={state.features} />;
}

function MapView({ features }: { features: BorderFeature[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasMap | null>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const viewRef = useRef<ViewTransform>({ k: 1, x: 0, y: 0 });
  const selectedRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const [selected, setSelected] = useState<BorderFeature | null>(null);
  const [query, setQuery] = useState('');

  const schedule = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      rendererRef.current?.draw(viewRef.current, selectedRef.current);
    });
  }, []);

  const select_ = useCallback(
    (feature: BorderFeature | null) => {
      selectedRef.current = feature?.fid ?? null;
      setSelected(feature);
      schedule();
    },
    [schedule],
  );

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const renderer = new CanvasMap(canvas, features);
    rendererRef.current = renderer;

    const applyExtent = (behavior: ZoomBehavior<HTMLCanvasElement, unknown>, w: number, h: number) => {
      const base = baseScale(w, h);
      const half = HALF_WORLD * base;
      behavior.translateExtent([
        [w / 2 - half, h / 2 - half],
        [w / 2 + half, h / 2 + half],
      ]);
      behavior.extent([[0, 0], [w, h]]);
    };

    const behavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .on('zoom', (event: { transform: ViewTransform }) => {
        const { k, x, y } = event.transform;
        viewRef.current = { k, x, y };
        schedule();
      });
    zoomRef.current = behavior;
    const sel = select(canvas);
    sel.call(behavior).on('dblclick.zoom', null);

    const observer = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      renderer.resize(width, height, window.devicePixelRatio || 1);
      applyExtent(behavior, width, height);
      schedule();
    });
    observer.observe(container);

    let downX = 0;
    let downY = 0;
    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 4) return; // a drag, not a click
      const rect = canvas.getBoundingClientRect();
      select_(renderer.hitTest(e.clientX - rect.left, e.clientY - rect.top, viewRef.current) ?? null);
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);

    return () => {
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      sel.on('.zoom', null);
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      rendererRef.current = null;
    };
  }, [features, schedule, select_]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const named = features.filter((f): f is BorderFeature & { name: string } => f.name !== null);
    const list = q ? named.filter((f) => f.name.toLowerCase().includes(q)) : named;
    return [...list].sort((a, b) => a.name.localeCompare(b.name)).slice(0, MAX_LIST);
  }, [features, query]);

  const chooseFromList = (feature: BorderFeature) => {
    select_(feature);
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;
    const behavior = zoomRef.current;
    if (!renderer || !canvas || !behavior) return;
    const { width, height } = renderer.size;
    const v = viewForBbox(feature.bbox, width, height, MAX_ZOOM);
    select(canvas).call(behavior.transform, zoomIdentity.translate(v.x, v.y).scale(v.k));
  };

  return (
    <div className="map-layout">
      <div className="map-main" ref={containerRef}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Political map of the world in ${YEAR}. Use the list to choose a state.`}
        />
      </div>
      <aside className="map-side">
        <label>
          Search states
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <ul className="state-list">
          {matches.map((f) => (
            <li key={f.fid}>
              <button type="button" onClick={() => chooseFromList(f)} aria-pressed={selected?.fid === f.fid}>
                {f.name}
              </button>
            </li>
          ))}
        </ul>
        <section aria-live="polite" className="detail">
          {selected ? (
            <>
              <h2>{selected.name ?? 'Unnamed territory'}</h2>
              <p>
                {selected.name
                  ? `Shown as it appeared in ${YEAR}. Ruler, army and events have not been curated yet.`
                  : 'The source data gives no name for this area (unclaimed or unattributed land).'}
              </p>
            </>
          ) : (
            <p>Select a state on the map or from the list.</p>
          )}
        </section>
      </aside>
    </div>
  );
}
