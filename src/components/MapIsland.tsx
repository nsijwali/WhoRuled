import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { CanvasMap } from '../map/CanvasMap';
import { HALF_WORLD, VIEW_NORTH, VIEW_SOUTH, baseScale, homeView, viewForBbox } from '../map/geometry';
import { eraOf } from '../map/eras';
import { correctionUrl, formatYear } from '../map/format';
import { realmFill } from '../map/palette';
import { themeOf, themedFillCss, type EraTheme } from '../map/theme';
import { loadFactsIndex, loadPolity, type FactsIndex } from '../map/loadFacts';
import { loadBorders, loadYears } from '../map/loadGeo';
import type { Polity } from '../data/schema';
import type { BorderFeature, ViewTransform } from '../map/types';

const MAX_ZOOM = 64;
const MAX_LIST = 50;
const PLAY_INTERVAL_MS = 1100;
const DISSOLVE_MS = 360;
const LARGEST_SHOWN = 6;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; features: BorderFeature[] };

const DEFAULT_YEAR = 2026;

const collator = new Intl.Collator('en', { sensitivity: 'base', ignorePunctuation: true });

function prefersLessMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

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

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      // Pressing play on the last snapshot starts the time-lapse again from the first.
      if (!p && year !== null && years.indexOf(year) === years.length - 1 && years[0] !== undefined) setYear(years[0]);
      return !p;
    });
  }, [year, years]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (el && /^(INPUT|BUTTON|TEXTAREA|SELECT|A|SUMMARY)$/.test(el.tagName)) return;
      if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, togglePlay]);

  const theme = themeOf(year ?? DEFAULT_YEAR);
  // The whole page follows the year: CSS custom properties per era hang off this attribute.
  useEffect(() => {
    document.documentElement.dataset['era'] = theme.id;
    return () => {
      document.documentElement.dataset['era'] = 'modern';
    };
  }, [theme.id]);

  if (state.status === 'error') return <p role="alert" className="boot">Could not load the map: {state.message}</p>;
  if (state.status === 'loading' || year === null) return <p role="status" className="boot">Loading the map…</p>;
  return (
    <MapView
      features={state.features}
      year={year}
      theme={theme}
      factsIndex={factsIndex}
      dataBase={dataBase}
      timeline={
        <Timeline
          years={years}
          year={year}
          playing={playing}
          onChange={setYear}
          onStep={step}
          onTogglePlay={togglePlay}
        />
      }
    />
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
  const labelEvery = Math.max(1, Math.ceil(years.length / 6));
  // A label is drawn every `labelEvery` snapshots, plus the last, unless the last would crowd its neighbour.
  const isMajor = (i: number) => i === last || (i % labelEvery === 0 && last - i >= labelEvery * 0.75);
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
          {years.map((y, i) => {
            const major = isMajor(i);
            const edge = i === 0 ? ' first' : i === last ? ' last' : '';
            return (
              <span key={y} style={{ '--p': i / Math.max(1, last) } as CSSProperties} className={(major ? 'major' : '') + edge}>
                {major ? formatYear(y) : ''}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MapView({
  features,
  year,
  theme,
  factsIndex,
  dataBase,
  timeline,
}: {
  features: BorderFeature[];
  year: number;
  theme: EraTheme;
  factsIndex: FactsIndex;
  dataBase: string;
  timeline: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const rendererRef = useRef<CanvasMap | null>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const viewRef = useRef<ViewTransform>({ k: 1, x: 0, y: 0 });
  const homedRef = useRef(false);
  const selectedRef = useRef<number | null>(null);
  const selectedNameRef = useRef<string | null>(null);
  const hoverRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const dissolveStartRef = useRef(0);
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

  /**
   * One animation loop for the whole map. It draws a frame, then keeps going only while something moves:
   * the dissolve between snapshots, or the marching dashes around the chosen state.
   */
  const schedule = useCallback(() => {
    if (frameRef.current) return;
    const still = prefersLessMotion();
    const frame = (t: number) => {
      frameRef.current = 0;
      const renderer = rendererRef.current;
      if (!renderer) return;
      let dissolve = 1;
      if (renderer.dissolving) {
        dissolve = (t - dissolveStartRef.current) / DISSOLVE_MS;
        if (dissolve >= 1) renderer.endDissolve();
      }
      const ants = selectedRef.current !== null && !still;
      renderer.draw(viewRef.current, selectedRef.current, hoverRef.current, { phase: ants ? t / 60 : 0, dissolve });
      if (renderer.dissolving || ants) frameRef.current = requestAnimationFrame(frame);
    };
    frameRef.current = requestAnimationFrame(frame);
  }, []);

  const select_ = useCallback(
    (feature: BorderFeature | null) => {
      selectedRef.current = feature?.fid ?? null;
      selectedNameRef.current = feature?.name ?? null;
      setSelected(feature);
      schedule();
    },
    [schedule],
  );

  // Map lettering is drawn on the canvas, so redraw once this era's font has arrived.
  const themeRef = useRef(theme);
  themeRef.current = theme;
  useEffect(() => {
    document.fonts.load(theme.map.labelFont).then(schedule, () => undefined);
  }, [schedule, theme]);

  // Crossing into another era re-dresses the map; dissolve from the old look unless motion is reduced.
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || renderer.currentTheme === theme) return;
    if (!prefersLessMotion()) {
      renderer.captureGhost();
      dissolveStartRef.current = performance.now();
    }
    renderer.setTheme(theme);
    schedule();
  }, [theme, schedule]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const renderer = new CanvasMap(canvas, features, rendererRef.current !== null && !prefersLessMotion(), themeRef.current);
    rendererRef.current = renderer;
    dissolveStartRef.current = performance.now();

    const applyExtent = (behavior: ZoomBehavior<HTMLCanvasElement, unknown>, w: number, h: number) => {
      const base = baseScale(w, h);
      const half = HALF_WORLD * base;
      behavior.translateExtent([
        [w / 2 - half, h / 2 + VIEW_NORTH * base],
        [w / 2 + half, h / 2 + VIEW_SOUTH * base],
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
      if (!homedRef.current) {
        homedRef.current = true;
        const home = homeView(width, height);
        sel.call(behavior.transform, zoomIdentity.translate(home.x, home.y).scale(home.k));
      }
      sel.call(behavior.translateBy, 0, 0); // re-apply the pan limits for the new size
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
    };
  }, [features, schedule, select_]);

  // Feature ids are only stable within one snapshot, so carry the chosen state over by name.
  useEffect(() => {
    const name = selectedNameRef.current;
    select_(name === null ? null : (features.find((f) => f.name === name) ?? null));
    hoverRef.current = null;
    setHover(null);
  }, [features, select_]);

  const named = useMemo(
    () => features.filter((f): f is BorderFeature & { name: string } => f.name !== null),
    [features],
  );
  const largest = useMemo(() => [...named].sort((a, b) => b.area - a.area).slice(0, LARGEST_SHOWN), [named]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? named.filter((f) => f.name.toLowerCase().includes(q)) : named;
    return [...list].sort((a, b) => collator.compare(a.name, b.name)).slice(0, MAX_LIST);
  }, [named, query]);

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
    const curated = named.filter((f) => factsIndex[String(year)]?.[f.name] !== undefined);
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
    const renderer = rendererRef.current;
    if (!canvas || !behavior || !renderer) return;
    const home = homeView(renderer.size.width, renderer.size.height);
    select(canvas).call(behavior.transform, zoomIdentity.translate(home.x, home.y).scale(home.k)).call(behavior.translateBy, 0, 0);
  };

  /** Up and down arrows move through the list, Home and End jump to its ends. */
  const onListKey = (e: ReactKeyboardEvent<HTMLUListElement>) => {
    const buttons = [...(listRef.current?.querySelectorAll('button') ?? [])];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const to =
      e.key === 'ArrowDown' ? at + 1 : e.key === 'ArrowUp' ? at - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    buttons[Math.max(0, Math.min(buttons.length - 1, to))]?.focus();
  };

  const status = hover?.feature ?? selected;
  const tipLeft = hover && hover.x > (rendererRef.current?.size.width ?? 0) - 220;
  return (
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
        <details className="legend">
          <summary>Map key</summary>
          <ul>
            <li>
              <i className="key-realm" />
              Same colour: one realm, a state and the lands it rules
            </li>
            <li>
              <i className="key-wild" />
              No state recorded
            </li>
            <li>
              <i className="key-approx" />
              Dashed edge: the border is approximate
            </li>
            <li>
              <i className="key-chosen" />
              The state you chose
            </li>
          </ul>
        </details>
        {hover && (
          <div
            className="tooltip"
            style={tipLeft ? { right: (rendererRef.current?.size.width ?? 0) - hover.x + 14, top: hover.y + 14 } : { left: hover.x + 14, top: hover.y + 14 }}
            aria-hidden="true"
          >
            {hover.feature.name ?? 'No state recorded'}
            {hover.feature.overlord && <small>under {hover.feature.overlord}</small>}
          </div>
        )}
      </div>
      {timeline}
      <aside className="map-side" data-view={selected ? 'detail' : 'list'}>
        <div className="side-tools">
          <label>
            <span className="sr-only">Search states</span>
            <input type="search" placeholder="Search states" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button type="button" className="surprise" onClick={surprise}>
            Surprise me
          </button>
        </div>
        <ul className="state-list" ref={listRef} onKeyDown={onListKey} aria-label={`States in ${formatYear(year)}`}>
          {matches.map((f) => (
            <li key={f.fid}>
              <button type="button" onClick={() => chooseFromList(f)} aria-pressed={selected?.fid === f.fid}>
                <i className="swatch" style={{ background: themedFillCss(theme, realmFill(f.name, f.overlord, theme.map.realms)) }} />
                {f.name}
              </button>
            </li>
          ))}
          {matches.length === 0 && <li className="empty">No state called “{query.trim()}” in {formatYear(year)}. Try another year or a shorter name.</li>}
        </ul>
        <section aria-live="polite" className="detail">
          {selected ? (
            <>
              <button type="button" className="back" onClick={() => select_(null)}>
                Back to the list
              </button>
              <h2>{selected.name ?? 'Unnamed territory'}</h2>
              {polity ? (
                <PolityFacts polity={polity} year={year} />
              ) : (
                <p>
                  {selected.name
                    ? `Shown as it appeared in ${formatYear(year)}. Ruler details are not available for this state yet.`
                    : 'The source data gives no name for this area (unclaimed or unattributed land).'}
                </p>
              )}
              {selected.precision === 1 && <p className="hint">Its border is approximate in the source data (drawn dashed).</p>}
              <Hierarchy selected={selected} features={features} onChoose={chooseFromList} />
              <p>
                <a href={correctionUrl(selected.name, year)} target="_blank" rel="noopener noreferrer">
                  Suggest a correction
                </a>
              </p>
            </>
          ) : (
            <div className="overview">
              <p>
                In {formatYear(year)} the map shows {named.length.toLocaleString('en')} named states. States that share a
                colour belong to one realm.
              </p>
              <h3>Largest in {formatYear(year)}</h3>
              <ul className="largest">
                {largest.map((f) => (
                  <li key={f.fid}>
                    <i className="swatch" style={{ background: themedFillCss(theme, realmFill(f.name, f.overlord, theme.map.realms)) }} />
                    <button type="button" className="link" onClick={() => chooseFromList(f)}>
                      {f.name}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="hint">Click a state on the map or in the list. Left and right arrow keys change the year; space plays the time-lapse.</p>
            </div>
          )}
        </section>
      </aside>
      <div className="status-bar" aria-hidden="true">
        <span>{status ? `${status.name ?? 'No state recorded'}${status.overlord ? `, under ${status.overlord}` : ''}` : 'Point at a state to see its name'}</span>
        <span>Zoom {zoomLevel.toFixed(1)}×</span>
      </div>
    </div>
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
      {polity.review !== undefined && <p className="reviewed">Reviewed by {polity.review.by}, {polity.review.date}.</p>}
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
    </>
  );
}
