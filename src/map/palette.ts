/** The sixteen-colour screen of an early-90s PC, minus the blues that would vanish into the sea. */
export const REALM_COLOURS = [
  '#aa0000', '#00aa00', '#aa5500', '#00aaaa', '#aa00aa', '#ffff55',
  '#ff5555', '#55ff55', '#ff55ff', '#55ffff', '#ffaa00', '#aaaaaa',
] as const;

/** FNV-1a, so a realm keeps its colour from one snapshot to the next. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Colour for a realm; territories sharing an overlord share its colour, so empires read as one block. */
export function realmColour(name: string | null, overlord: string | null): string | null {
  const key = overlord ?? name;
  if (key === null) return null;
  return REALM_COLOURS[hash(key) % REALM_COLOURS.length] ?? null;
}
