import { REALM_FILLS, type RealmFill } from './palette';

/** The five looks of the site. The page and the map both follow the year being viewed. */
export type EraThemeId = 'cave' | 'manuscript' | 'atlas' | 'newsprint' | 'modern';

/** A tile drawn from rows of characters, one character per `cell` screen pixels. */
export interface TileSpec {
  readonly rows: readonly string[];
  readonly colours: Readonly<Record<string, string>>;
  /** Screen pixels per character. */
  readonly cell: number;
}

/** CSS custom properties that restyle the whole page. Names are historical: `blue` is the panel colour, `grey` the window face. */
export interface ThemeVars {
  readonly black: string;
  readonly blue: string;
  readonly grey: string;
  readonly dgrey: string;
  readonly lblue: string;
  readonly cyan: string;
  readonly lcyan: string;
  readonly yellow: string;
  readonly white: string;
  readonly hi: string;
  readonly lo: string;
  /** Three swatches for the map key. */
  readonly keyA: string;
  readonly keyB: string;
  readonly keyC: string;
}

export interface EraTheme {
  readonly id: EraThemeId;
  /** First year (inclusive) this look is used for. */
  readonly from: number;
  readonly name: string;
  readonly vars: ThemeVars;
  /** CSS font stacks for headings and body text. */
  readonly pixel: string;
  readonly body: string;
  /** Size of window and panel headings, which the pixel face wants small and the text faces larger. */
  readonly headSize: string;
  /** Page background texture (a CSS `background-image`), or `none`. */
  readonly texture: string;
  readonly map: {
    readonly ocean: TileSpec;
    readonly wild: TileSpec;
    /** Two-colour fill pattern; `a` and `b` are replaced with the two colours of a realm. */
    readonly mixRows: readonly string[];
    readonly mixCell: number;
    readonly realms: readonly RealmFill[];
    readonly outline: string;
    readonly outlineWidth: number;
    readonly labelFont: string;
    readonly labelFill: string;
    readonly labelHalo: string;
    readonly glint: string;
    /** Marching dashes around the chosen state. */
    readonly selection: string;
  };
}

const solid = (c: string): RealmFill => ({ a: c, b: c });
const mix = (a: string, b: string): RealmFill => ({ a, b });
const CHECKER = ['ab', 'ba'];
const DIAGONAL = ['abbb', 'babb', 'bbab', 'bbba'];
const DOTS = ['abbb', 'bbbb', 'bbab', 'bbbb'];

const MODERN: EraTheme = {
  id: 'modern',
  from: 1990,
  name: 'Today',
  vars: {
    black: '#000000', blue: '#0000aa', grey: '#aaaaaa', dgrey: '#555555', lblue: '#5555ff',
    cyan: '#00aaaa', lcyan: '#55ffff', yellow: '#ffff55', white: '#ffffff', hi: '#ffffff', lo: '#555555',
    keyA: '#aa5500', keyB: '#ffff55', keyC: '#55ff55',
  },
  pixel: "'Silkscreen', 'Courier New', monospace",
  body: "'VT323', 'Courier New', monospace",
  headSize: '16px',
  texture: 'none',
  map: {
    ocean: { rows: ['oooooooo', 'oowwoooo', 'oooooooo', 'ooooooww'], colours: { o: '#0000aa', w: '#5555ff' }, cell: 2 },
    wild: { rows: ['gggg', 'gdgg', 'gggg', 'gggd'], colours: { g: '#aaaaaa', d: '#555555' }, cell: 1 },
    mixRows: CHECKER,
    mixCell: 1,
    realms: REALM_FILLS,
    outline: '#000000',
    outlineWidth: 1,
    labelFont: '16px Silkscreen',
    labelFill: '#ffffff',
    labelHalo: '#000000',
    glint: '#ffffff',
    selection: '#ffff55',
  },
};

/** Cold-war and world-war years: a newspaper map, spot colours and halftone dots. */
const NEWSPRINT: EraTheme = {
  id: 'newsprint',
  from: 1900,
  name: 'Newsprint',
  vars: {
    black: '#141414', blue: '#2b2b2b', grey: '#dcd8cc', dgrey: '#6a665a', lblue: '#8a8578',
    cyan: '#f2c230', lcyan: '#ff9a80', yellow: '#f2c230', white: '#f4f1e8', hi: '#f8f6ef', lo: '#6a665a',
    keyA: '#c8321f', keyB: '#f2c230', keyC: '#1f5f8a',
  },
  pixel: "'Special Elite Fit', 'Courier New', monospace",
  body: "'Special Elite Fit', 'Courier New', monospace",
  headSize: '20px',
  texture: 'radial-gradient(rgba(20,20,20,0.07) 1px, transparent 1.2px) 0 0 / 5px 5px',
  map: {
    ocean: { rows: ['wooo', 'oooo', 'ooow', 'oooo'], colours: { o: '#cdd4d4', w: '#a3b2b6' }, cell: 2 },
    wild: { rows: ['gggg', 'gdgg', 'gggg', 'gggd'], colours: { g: '#e9e5d8', d: '#c9c3b0' }, cell: 1 },
    mixRows: DOTS,
    mixCell: 1,
    realms: [
      solid('#c8321f'), solid('#1f5f8a'), solid('#d9a21b'), solid('#4f6b35'), solid('#7a2a2a'),
      solid('#3a8a87'), solid('#8a5a2a'), solid('#e07a3a'), solid('#5a4a7a'), solid('#7f8f95'),
      mix('#c8321f', '#f2d9a0'), mix('#1f5f8a', '#bcd3df'), mix('#4f6b35', '#d3dcb4'), mix('#7a2a2a', '#e8bdb0'),
      mix('#d9a21b', '#f6e8b8'), mix('#3a8a87', '#c4e0dd'), mix('#5a4a7a', '#d6cde3'), mix('#8a5a2a', '#e6cfae'),
      mix('#e07a3a', '#f7d3b8'), mix('#7f8f95', '#dfe5e6'),
    ],
    outline: '#141414',
    outlineWidth: 1.25,
    labelFont: '14px Special Elite Fit',
    labelFill: '#141414',
    labelHalo: '#f4f1e8',
    glint: '#ffffff',
    selection: '#f2c230',
  },
};

/** 1500 to 1899: an engraved atlas, hand-coloured in watercolour on cream paper. */
const ATLAS: EraTheme = {
  id: 'atlas',
  from: 1500,
  name: 'Atlas',
  vars: {
    black: '#1f2a36', blue: '#1f3a5f', grey: '#e4dcc3', dgrey: '#6f6c5e', lblue: '#5a7fa8',
    cyan: '#bcd7a4', lcyan: '#a9cde6', yellow: '#e6c273', white: '#f7f1e1', hi: '#fffaf0', lo: '#8f8a78',
    keyA: '#e8a29a', keyB: '#a8c98a', keyC: '#9fc1dc',
  },
  pixel: "'Fell Fit', Georgia, serif",
  body: "'Fell Fit', Georgia, serif",
  headSize: '23px',
  texture: 'linear-gradient(rgba(120,100,60,0.05), rgba(120,100,60,0.05))',
  map: {
    ocean: { rows: ['wwwwwwww', 'oooooooo', 'oooooooo', 'oooooooo', 'oooowwww', 'oooooooo'], colours: { o: '#dbe6e8', w: '#9db3bd' }, cell: 1 },
    wild: { rows: ['gggg', 'gdgg', 'gggg', 'gggd'], colours: { g: '#efe6cc', d: '#d3c7a5' }, cell: 1 },
    mixRows: DIAGONAL,
    mixCell: 1,
    realms: [
      solid('#e8a29a'), solid('#a8c98a'), solid('#f1db8c'), solid('#9fc1dc'), solid('#eab07c'),
      solid('#c5a8d3'), solid('#8fc9bd'), solid('#d9b88f'), solid('#e58b8b'), solid('#b9d27a'),
      mix('#e8a29a', '#c9605a'), mix('#a8c98a', '#5f8f45'), mix('#f1db8c', '#c9a53c'), mix('#9fc1dc', '#4f7fa8'),
      mix('#eab07c', '#c4753a'), mix('#c5a8d3', '#8a63a0'), mix('#8fc9bd', '#3f8f80'), mix('#d9b88f', '#a8814f'),
      mix('#e58b8b', '#a83f3f'), mix('#b9d27a', '#7f9a35'),
    ],
    outline: '#3b2f24',
    outlineWidth: 1,
    labelFont: '15px Fell Fit',
    labelFill: '#2b2118',
    labelHalo: '#f7f1e1',
    glint: '#ffffff',
    selection: '#fff8e6',
  },
};

/** Year 0 to 1499: a hand-illuminated manuscript map in inks and mineral pigments. */
const MANUSCRIPT: EraTheme = {
  id: 'manuscript',
  from: 0,
  name: 'Manuscript',
  vars: {
    black: '#2a1a0e', blue: '#6b2418', grey: '#d8c69a', dgrey: '#6f5d3c', lblue: '#8a4a3a',
    cyan: '#e0b84f', lcyan: '#f0cf8a', yellow: '#e9b949', white: '#f6ead0', hi: '#f3e6c4', lo: '#8a7650',
    keyA: '#b6402a', keyB: '#d6a432', keyC: '#35508f',
  },
  pixel: "'Fell Fit', Georgia, serif",
  body: "'Fell Fit', Georgia, serif",
  headSize: '23px',
  texture: 'radial-gradient(rgba(80,50,20,0.10) 1px, transparent 1.4px) 0 0 / 7px 7px',
  map: {
    ocean: { rows: ['oooooooooo', 'ooowwooooo', 'oowoowoooo', 'oooooooooo', 'oooooooowo', 'oooooowwoo'], colours: { o: '#a9c0b4', w: '#7f9d92' }, cell: 2 },
    wild: { rows: ['gggg', 'gdgg', 'gggg', 'gggd'], colours: { g: '#e3d3a8', d: '#c9b58a' }, cell: 1 },
    mixRows: DOTS,
    mixCell: 1,
    realms: [
      solid('#b6402a'), solid('#35508f'), solid('#3f8f73'), solid('#d6a432'), solid('#9c3a5c'),
      solid('#e58a2d'), solid('#7f9a54'), solid('#6d4a8f'), solid('#d98a8a'), solid('#2f7f86'),
      mix('#b6402a', '#e9b949'), mix('#35508f', '#9fb4d6'), mix('#3f8f73', '#cfe0b0'), mix('#9c3a5c', '#e9b9c4'),
      mix('#d6a432', '#f4e0a0'), mix('#6d4a8f', '#c9b6dc'), mix('#2f7f86', '#a9d3d6'), mix('#e58a2d', '#f6d3a0'),
      mix('#7f9a54', '#d9e3b4'), mix('#d98a8a', '#f2cfc0'),
    ],
    outline: '#3a2412',
    outlineWidth: 1.25,
    labelFont: '15px Fell Fit',
    labelFill: '#2a1a0e',
    labelHalo: '#f3e6c4',
    glint: '#ffffff',
    selection: '#fff3c9',
  },
};

/** Before year 0: earth pigments and charcoal, as if drawn on a cave wall. */
const CAVE: EraTheme = {
  id: 'cave',
  from: -5000,
  name: 'Cave wall',
  vars: {
    black: '#1b130c', blue: '#4a3523', grey: '#b3a384', dgrey: '#5d4e3a', lblue: '#7a6a52',
    cyan: '#d9a755', lcyan: '#e8c27a', yellow: '#f2d38a', white: '#f1e6cc', hi: '#d2c3a0', lo: '#4a3c2b',
    keyA: '#cf9a3c', keyB: '#a8442a', keyC: '#dccba0',
  },
  pixel: "'Silkscreen', 'Courier New', monospace",
  body: "'VT323', 'Courier New', monospace",
  headSize: '16px',
  texture: 'radial-gradient(rgba(40,25,10,0.14) 1px, transparent 1.3px) 0 0 / 6px 6px',
  map: {
    ocean: { rows: ['oooooooo', 'owwooooo', 'oooooooo', 'oooooowo', 'ooooowwo', 'oooooooo'], colours: { o: '#2e241b', w: '#54432f' }, cell: 2 },
    wild: { rows: ['gggggg', 'gdgggg', 'gggggd', 'ggdggg'], colours: { g: '#a08968', d: '#85705a' }, cell: 1 },
    mixRows: DIAGONAL,
    mixCell: 1,
    realms: [
      solid('#cf9a3c'), solid('#a8442a'), solid('#dccba0'), solid('#6b4423'), solid('#7a8238'),
      solid('#b5652f'), solid('#7a3f55'), solid('#5f7580'), solid('#566b34'), solid('#8c3b1e'),
      mix('#cf9a3c', '#6b4423'), mix('#a8442a', '#dccba0'), mix('#7a8238', '#dccba0'), mix('#7a3f55', '#cf9a3c'),
      mix('#5f7580', '#dccba0'), mix('#566b34', '#cf9a3c'), mix('#b5652f', '#dccba0'), mix('#8c3b1e', '#cf9a3c'),
      mix('#6b4423', '#dccba0'), mix('#a8442a', '#cf9a3c'),
    ],
    outline: '#1b130c',
    outlineWidth: 1.5,
    labelFont: '16px Silkscreen',
    labelFill: '#f1e6cc',
    labelHalo: '#1b130c',
    glint: '#f1e6cc',
    selection: '#f2d38a',
  },
};

/** Ascending by start year. */
export const THEMES: readonly EraTheme[] = [CAVE, MANUSCRIPT, ATLAS, NEWSPRINT, MODERN];

/** The look for a year: the last theme that starts at or before it. */
export function themeOf(year: number): EraTheme {
  let current: EraTheme = THEMES[0] as EraTheme;
  for (const theme of THEMES) if (theme.from <= year) current = theme;
  return current;
}

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** The stylesheet that switches the page between looks, keyed by `data-era` on the root element. */
export function themeCss(): string {
  return THEMES.map((t) => {
    const vars = Object.entries(t.vars).map(([k, v]) => `--${kebab(k)}: ${v};`).join(' ');
    return `:root[data-era='${t.id}'] { ${vars} --pixel: ${t.pixel}; --body: ${t.body}; --texture: ${t.texture}; --head-size: ${t.headSize}; }`;
  }).join('\n');
}

/** The tile for a two-colour realm fill in this theme. */
export function mixTile(theme: EraTheme, fill: RealmFill): TileSpec {
  return { rows: theme.map.mixRows, colours: { a: fill.a, b: fill.b }, cell: theme.map.mixCell };
}

/** A realm fill as a CSS background, matching what the canvas draws. */
export function themedFillCss(theme: EraTheme, fill: RealmFill | null): string {
  const wild = theme.map.wild.colours;
  if (!fill) return `repeating-conic-gradient(${wild['g']} 0 25%, ${wild['d']} 0 50%) 0 0 / 4px 4px`;
  if (fill.a === fill.b) return fill.a;
  return `repeating-conic-gradient(${fill.a} 0 25%, ${fill.b} 0 50%) 0 0 / 3px 3px`;
}
