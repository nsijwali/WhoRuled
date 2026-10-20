/** The sixteen colours of an EGA screen. The UI and the map use nothing else. */
export const EGA = {
  black: '#000000',
  blue: '#0000aa',
  green: '#00aa00',
  cyan: '#00aaaa',
  red: '#aa0000',
  magenta: '#aa00aa',
  brown: '#aa5500',
  grey: '#aaaaaa',
  darkGrey: '#555555',
  lightBlue: '#5555ff',
  lightGreen: '#55ff55',
  lightCyan: '#55ffff',
  lightRed: '#ff5555',
  lightMagenta: '#ff55ff',
  yellow: '#ffff55',
  white: '#ffffff',
} as const;

/** A realm fill: one EGA colour, or two in a checkerboard, the way 16-colour games mixed new shades. */
export interface RealmFill {
  readonly a: string;
  readonly b: string;
}

const { green, cyan, red, magenta, brown, lightGreen, lightCyan, lightRed, lightMagenta, yellow } = EGA;
const solid = (c: string): RealmFill => ({ a: c, b: c });
const mix = (a: string, b: string): RealmFill => ({ a, b });

/** Twenty fills; blues stay out because the sea is blue, greys because unclaimed land is grey. */
export const REALM_FILLS: readonly RealmFill[] = [
  solid(red), solid(green), solid(cyan), solid(magenta), solid(brown),
  solid(lightRed), solid(lightGreen), solid(lightMagenta),
  mix(red, lightRed), mix(green, lightGreen), mix(cyan, lightCyan), mix(magenta, lightMagenta),
  mix(brown, yellow), mix(brown, lightRed), mix(green, yellow), mix(cyan, lightGreen),
  mix(red, brown), mix(magenta, lightRed), mix(lightRed, yellow), mix(lightGreen, lightCyan),
];

/** FNV-1a, so a realm keeps its fill from one snapshot to the next. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Fill for a realm; territories sharing an overlord share its fill, so empires read as one block. */
export function realmFill(name: string | null, overlord: string | null): RealmFill | null {
  const key = overlord ?? name;
  if (key === null) return null;
  return REALM_FILLS[hash(key) % REALM_FILLS.length] ?? null;
}

/** The same fill as a CSS background, a 2px checkerboard for mixed fills. */
export function fillCss(fill: RealmFill | null): string {
  if (!fill) return `repeating-conic-gradient(${EGA.grey} 0 25%, ${EGA.darkGrey} 0 50%) 0 0 / 4px 4px`;
  if (fill.a === fill.b) return fill.a;
  return `repeating-conic-gradient(${fill.a} 0 25%, ${fill.b} 0 50%) 0 0 / 2px 2px`;
}
