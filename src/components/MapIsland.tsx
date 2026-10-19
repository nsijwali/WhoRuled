import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CanvasMap } from '../map/CanvasMap';
import { HALF_WORLD, baseScale, viewForBbox } from '../map/geometry';
import { formatYear } from '../map/format';
import { loadFactsIndex, loadPolity, type FactsIndex } from '../map/loadFacts';
import { loadBorders, loadYears } from '../map/loadGeo';
import type { Polity } from '../data/schema';
import type { BorderFeature, ViewTransform } from '../map/types';

const MAX_ZOOM = 64;
const MAX_LIST = 50;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; features: BorderFeature[] };

const DEFAULT_YEAR = 1492;

export default function MapIsland({ dataBase = '/data/' }: { dataBase?: string }) {
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [factsIndex, setFactsIndex] = useState<FactsIndex>({});

  useEffect(() => {
    // Facts are optional: the map works without them.
    loadFactsIndex(dataBase)
      .then(setFactsIndex)
      .catch(() => setFactsIndex({}));
  }, [dataBase]);

  useEffect(() => {
    let cancelled = false;
    loadYears(dataBase)
      .then((list) => {
        if (cancelled) return;
        setYears(list);
        setYear(list.includes(DEFAULT_YEAR) ? DEFAULT_YEAR : (list[0] ?? null));
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ status: 'error', message: e instanceof Error ? e.message : 'Unknown error' });
      });
    return () => {
      cancelled = true;
    };
  }, [dataBase]);

  useEffect(() => {
    if (year === null) return;
    let cancelled = false;
    loadBorders(year, dataBase)
      .then((features) => !cancelled && setState({ status: 'ready', features }))
      .catch((e: unknown) => {
        if (!cancelled) setState({ status: 'error', message: e instanceof Error ? e.message : 'Unknown error' });
      });
    return () => {
      cancelled = true;
    };
  }, [year, dataBase]);

  if (state.status === 'error') return <p role="alert">Could not load the map: {state.message}</p>;
  if (state.status === 'loading' || year === null) return <p role="status">Loading map…</p>;
  return (
    <div className="map-shell">
      <YearSlider years={years} year={year} onChange={setYear} />
      <MapView features={state.features} year={year} factsIndex={factsIndex} dataBase={dataBase} />
    </div>
  );
}

function YearSlider({ years, year, onChange }: { years: number[]; year: number; onChange: (y: number) => void }) {
  const index = Math.max(0, years.indexOf(year));
  return (
    <div className="year-slider">
      <label htmlFor="year-range">Year</label>
      <input
        id="year-range"
        type="range"
        min={0}
        max={years.length - 1}
        step={1}
        value={index}
        aria-valuetext={formatYear(year)}
        onChange={(e) => {
          const next = years[Number(e.target.value)];
          if (next !== undefined) onChange(next);
        }}
      />
      <output htmlFor="year-range">{formatYear(year)}</output>
    </div>
  );
}

function MapView({
  features,
  year,
  factsIndex,
  dataBase,
}: {
  features: BorderFeature[];
  year: number;
  factsIndex: FactsIndex;
  dataBase: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasMap | null>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const viewRef = useRef<ViewTransform>({ k: 1, x: 0, y: 0 });
  const selectedRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const [selected, setSelected] = useState<BorderFeature | null>(null);
  const [query, setQuery] = useState('');
  const [polity, setPolity] = useState<Polity | null>(null);

  const qid = selected?.name ? factsIndex[String(year)]?.[selected.name] : undefined;
  useEffect(() => {
    setPolity(null);
    if (!qid) return;
    let cancelled = false;
    loadPolity(qid, dataBase)
      .then((p) => !cancelled && setPolity(p))
      .catch(() => undefined); // fall back to the plain description
    return () => {
      cancelled = true;
    };
  }, [qid, dataBase]);

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

  useEffect(() => {
    select_(null); // feature ids are only stable within one snapshot
  }, [features, select_]);

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
          aria-label={`Political map of the world in ${formatYear(year)}. Use the list to choose a state.`}
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
              {polity ? (
                <PolityFacts polity={polity} year={year} />
              ) : (
                <p>
                  {selected.name
                    ? `Shown as it appeared in ${formatYear(year)}. Ruler, army and events have not been curated yet.`
                    : 'The source data gives no name for this area (unclaimed or unattributed land).'}
                </p>
              )}
              <Hierarchy selected={selected} features={features} onChoose={chooseFromList} />
            </>
          ) : (
            <p>Select a state on the map or from the list.</p>
          )}
        </section>
      </aside>
    </div>
  );
}

function PolityFacts({ polity, year }: { polity: Polity; year: number }) {
  const rulers = polity.rulers.filter((r) => r.from <= year && (r.to === null || r.to >= year));
  return (
    <>
      <p>{polity.summary}</p>
      {rulers.length > 0 && (
        <>
          <h3>Ruler in {formatYear(year)}</h3>
          <ul>
            {rulers.map((r) => (
              <li key={`${r.name}-${r.from}`}>
                {r.name}, {r.title} ({formatYear(r.from)}–{r.to === null ? 'present' : formatYear(r.to)}){' '}
                <a href={r.source.url} target="_blank" rel="noopener noreferrer">
                  source
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      {polity.armySize && (
        <p>
          Army: about {polity.armySize.value.toLocaleString('en')} ({formatYear(polity.armySize.year)}, {polity.armySize.confidence}{' '}
          confidence){' '}
          <a href={polity.armySize.source.url} target="_blank" rel="noopener noreferrer">
            source
          </a>
        </p>
      )}
      {polity.events.length > 0 && (
        <>
          <h3>Events</h3>
          <ul>
            {polity.events.map((e) => (
              <li key={`${e.year}-${e.summary}`}>
                {formatYear(e.year)}: {e.summary}{' '}
                <a href={e.source.url} target="_blank" rel="noopener noreferrer">
                  source
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      {polity.review === undefined && <p className="unreviewed">Not yet reviewed by a human.</p>}
    </>
  );
}

const MAX_SUBJECTS = 12;

/** Who this state answered to, and who answered to it, as recorded in the border dataset's SUBJECTO field. */
function Hierarchy({
  selected,
  features,
  onChoose,
}: {
  selected: BorderFeature;
  features: BorderFeature[];
  onChoose: (feature: BorderFeature) => void;
}) {
  const overlord = selected.overlord ? features.find((f) => f.name === selected.overlord) : undefined;
  const subjects = selected.name
    ? features.filter((f) => f.overlord === selected.name && f.fid !== selected.fid)
    : [];
  if (!selected.overlord && subjects.length === 0) return null;
  const shown = subjects.slice(0, MAX_SUBJECTS);
  return (
    <>
      <h3>Rule hierarchy</h3>
      <ul>
        {selected.overlord && (
          <li>
            Under the sovereignty of{' '}
            {overlord ? (
              <button type="button" className="link" onClick={() => onChoose(overlord)}>
                {selected.overlord}
              </button>
            ) : (
              selected.overlord
            )}
          </li>
        )}
        {shown.length > 0 && (
          <li>
            Sovereign over:{' '}
            {shown.map((f, i) => (
              <span key={f.fid}>
                {i > 0 && ', '}
                <button type="button" className="link" onClick={() => onChoose(f)}>
                  {f.name}
                </button>
              </span>
            ))}
            {subjects.length > shown.length && ` and ${subjects.length - shown.length} more`}
          </li>
        )}
      </ul>
      <p className="unreviewed">From the border dataset, not yet curated or sourced.</p>
    </>
  );
}
