import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { CanvasMap } from '../map/CanvasMap';
import { HALF_WORLD, baseScale, viewForBbox } from '../map/geometry';
import { eraOf } from '../map/eras';
import { formatYear } from '../map/format';
import { realmColour } from '../map/palette';
import { loadFactsIndex, loadPolity, type FactsIndex } from '../map/loadFacts';
import { loadBorders, loadYears } from '../map/loadGeo';
import type { Polity } from '../data/schema';
import type { BorderFeature, ViewTransform } from '../map/types';

const MAX_ZOOM = 64;
const MAX_LIST = 50;
const PLAY_INTERVAL_MS = 1100;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; features: BorderFeature[] };

const DEFAULT_YEAR = 1492;

export default function MapIsland({ dataBase = '/data/' }: { dataBase?: string }) {
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
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

  const step = useCallback(
    (delta: number) => {
      if (year === null) return;
      const next = years[Math.min(years.length - 1, Math.max(0, years.indexOf(year) + delta))];
      if (next !== undefined) setYear(next);
    },
    [year, years],
  );

  // Time-lapse: advance one snapshot per tick and stop at the last one.
  useEffect(() => {
    if (!playing || year === null) return;
    if (years.indexOf(year) >= years.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => step(1), PLAY_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [playing, year, years, step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (el && /^(INPUT|BUTTON|TEXTAREA|SELECT|A)$/.test(el.tagName)) return;
      if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  if (state.status === 'error') return <p role="alert" className="boot">Could not load the map: {state.message}</p>;
  if (state.status === 'loading' || year === null) return <p role="status" className="boot">Loading map…</p>;
  return (
    <div className="map-shell">
      <MapView
        features={state.features}
        year={year}
        factsIndex={factsIndex}
        dataBase={dataBase}
        timeline={
          <Timeline
            years={years}
            year={year}
            playing={playing}
            onChange={setYear}
            onStep={step}
            onTogglePlay={() => setPlaying((p) => !p)}
          />
        }
      />
    </div>
  );
}

function Timeline({
  years,
  year,
  playing,
  onChange,
  onStep,
  onTogglePlay,
}: {
  years: number[];
  year: number;
  playing: boolean;
  onChange: (y: number) => void;
  onStep: (delta: number) => void;
  onTogglePlay: () => void;
}) {
  const index = Math.max(0, years.indexOf(year));
  const last = years.length - 1;
  const labelEvery = Math.max(1, Math.ceil(years.length / 7));
  return (
    <div className="year-slider">
      <div className="lcd" aria-hidden="true">
        <output htmlFor="year-range">{formatYear(year)}</output>
        <span>{eraOf(year).name}</span>
      </div>
      <div className="transport" role="group" aria-label="Time controls">
        <button type="button" onClick={() => onChange(years[0] ?? year)} disabled={index === 0} aria-label="First snapshot">
          |&lt;
        </button>
        <button type="button" onClick={() => onStep(-1)} disabled={index === 0} aria-label="Earlier snapshot">
          &lt;
        </button>
        <button type="button" className="play" onClick={onTogglePlay} aria-pressed={playing}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={() => onStep(1)} disabled={index === last} aria-label="Later snapshot">
          &gt;
        </button>
        <button type="button" onClick={() => onChange(years[last] ?? year)} disabled={index === last} aria-label="Last snapshot">
          &gt;|
        </button>
      </div>
      <div className="ruler">
        <label htmlFor="year-range" className="sr-only">
          Year
        </label>
        <input
          id="year-range"
          type="range"
          min={0}
          max={last}
          step={1}
          value={index}
          aria-valuetext={`${formatYear(year)}, ${eraOf(year).name}`}
          onChange={(e) => {
            const next = years[Number(e.target.value)];
            if (next !== undefined) onChange(next);
          }}
        />
        <div className="ticks" aria-hidden="true">
          {years.map((y, i) => (
            <span key={y} style={{ '--p': i / Math.max(1, last) } as CSSProperties} className={i % labelEvery === 0 || i === last ? 'major' : undefined}>
              {i % labelEvery === 0 || i === last ? formatYear(y) : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MapView({
  features,
  year,
  factsIndex,
  dataBase,
  timeline,
}: {
  features: BorderFeature[];
  year: number;
  factsIndex: FactsIndex;
  dataBase: string;
  timeline: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasMap | null>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const viewRef = useRef<ViewTransform>({ k: 1, x: 0, y: 0 });
  const selectedRef = useRef<number | null>(null);
  const hoverRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const frameRef = useRef(0);
  const [selected, setSelected] = useState<BorderFeature | null>(null);
  const [hover, setHover] = useState<{ feature: BorderFeature; x: number; y: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
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
      rendererRef.current?.draw(viewRef.current, selectedRef.current, hoverRef.current, phaseRef.current);
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

  // Marching dashes around the chosen state, unless the visitor asked for less motion.
  useEffect(() => {
    if (selected === null || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const loop = (t: number) => {
      phaseRef.current = t / 60;
      rendererRef.current?.draw(viewRef.current, selectedRef.current, hoverRef.current, phaseRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [selected]);

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
        setZoomLevel(k);
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
    let hoverFrame = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.buttons !== 0 || hoverFrame) return;
      hoverFrame = requestAnimationFrame(() => {
        hoverFrame = 0;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const found = renderer.hitTest(x, y, viewRef.current);
        const fid = found?.fid ?? null;
        if (fid !== hoverRef.current) {
          hoverRef.current = fid;
          setHover(found ? { feature: found, x, y } : null);
          schedule();
        } else if (found) {
          setHover({ feature: found, x, y });
        }
      });
    };
    const onLeave = () => {
      hoverRef.current = null;
      setHover(null);
      schedule();
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);

    return () => {
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      sel.on('.zoom', null);
      cancelAnimationFrame(frameRef.current);
      cancelAnimationFrame(hoverFrame);
      frameRef.current = 0;
      rendererRef.current = null;
    };
  }, [features, schedule, select_]);

  useEffect(() => {
    select_(null); // feature ids are only stable within one snapshot
    hoverRef.current = null;
    setHover(null);
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

  /** Jump to a random state that has curated facts this year, or any named state when none do. */
  const surprise = () => {
    const named = features.filter((f) => f.name !== null);
    const curated = named.filter((f) => f.name !== null && factsIndex[String(year)]?.[f.name] !== undefined);
    const pool = curated.length > 0 ? curated : named;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) chooseFromList(pick);
  };

  const zoomBy = (factor: number) => {
    const canvas = canvasRef.current;
    const behavior = zoomRef.current;
    if (canvas && behavior) select(canvas).call(behavior.scaleBy, factor);
  };
  const resetView = () => {
    const canvas = canvasRef.current;
    const behavior = zoomRef.current;
    if (canvas && behavior) select(canvas).call(behavior.transform, zoomIdentity);
  };

  const status = hover?.feature ?? selected;
  return (
    <>
      <div className="map-layout">
        <div className="map-main" ref={containerRef}>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Political map of the world in ${formatYear(year)}. Use the list to choose a state.`}
          />
          <div className="zoom-controls" role="group" aria-label="Map zoom">
            <button type="button" onClick={() => zoomBy(1.6)} aria-label="Zoom in">
              +
            </button>
            <button type="button" onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out">
              -
            </button>
            <button type="button" onClick={resetView} aria-label="Show the whole world">
              All
            </button>
          </div>
          {hover && (
            <div className="tooltip" style={{ left: hover.x + 14, top: hover.y + 14 }} aria-hidden="true">
              {hover.feature.name ?? 'Unnamed land'}
            </div>
          )}
        </div>
        <aside className="map-side">
          <div className="side-tools">
            <label>
              <span className="sr-only">Search states</span>
              <input type="search" placeholder="Search states" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <button type="button" className="surprise" onClick={surprise}>
              Surprise me
            </button>
          </div>
          <ul className="state-list">
            {matches.map((f) => (
              <li key={f.fid}>
                <button type="button" onClick={() => chooseFromList(f)} aria-pressed={selected?.fid === f.fid}>
                  <i className="swatch" style={{ background: realmColour(f.name, f.overlord) ?? '#8c8c8c' }} />
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
              <p>Pick a state on the map or in the list, or press Surprise me.</p>
            )}
          </section>
        </aside>
      </div>
      {timeline}
      <div className="status-bar" aria-hidden="true">
        <span>{status ? `${status.name ?? 'Unnamed land'}${status.overlord ? ` (under ${status.overlord})` : ''}` : 'Hover a state'}</span>
        <span>
          {eraOf(year).name} · zoom {zoomLevel.toFixed(1)}×
        </span>
      </div>
    </>
  );
}

function inYear(r: { from: number; to: number | null }, year: number): boolean {
  return r.from <= year && (r.to === null || r.to >= year);
}

function PolityFacts({ polity, year }: { polity: Polity; year: number }) {
  const rulers = polity.rulers.filter((r) => inYear(r, year));
  const offices = polity.offices.filter((o) => inYear(o, year));
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
      {offices.length > 0 && (
        <>
          <h3>Government below the ruler</h3>
          <ul>
            {offices.map((o) => (
              <li key={`${o.name}-${o.title}-${o.from}`}>
                {o.name}, {o.title} ({formatYear(o.from)}–{o.to === null ? 'present' : formatYear(o.to)}){' '}
                <a href={o.source.url} target="_blank" rel="noopener noreferrer">
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
