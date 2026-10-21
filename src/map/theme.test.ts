import { describe, expect, it } from 'vitest';
import { THEMES, themeCss, themeOf, themedFillCss, type EraTheme } from './theme';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('themeOf', () => {
  it.each([
    [-1000, 'cave'], [-1, 'cave'], [0, 'manuscript'], [1492, 'manuscript'], [1499, 'manuscript'],
    [1500, 'atlas'], [1899, 'atlas'], [1900, 'newsprint'], [1989, 'newsprint'], [1990, 'modern'], [2026, 'modern'],
  ])('picks the look for %i', (year, id) => {
    expect(themeOf(year).id).toBe(id);
  });
  it('lists themes in ascending order of start year', () => {
    expect(THEMES.map((t) => t.from)).toEqual([...THEMES.map((t) => t.from)].sort((a, b) => a - b));
  });
});

describe.each(THEMES.map((t) => [t.id, t] as const))('%s theme', (_id, t: EraTheme) => {
  const v = t.vars;
  it('keeps page text readable (WCAG AA, 4.5:1)', () => {
    const pairs: [string, string, string][] = [
      ['white on panel', v.white, v.blue], ['accent on panel', v.yellow, v.blue], ['links on panel', v.lcyan, v.blue],
      ['ink on window', v.black, v.grey], ['ink on selected row', v.black, v.cyan], ['text on list', v.white, v.black],
      ['panel text on page', v.blue, v.white], ['panel text on window', v.blue, v.grey], ['ink on accent button', v.black, v.yellow],
    ];
    for (const [what, fg, bg] of pairs) expect(contrast(fg, bg), `${what}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });
  it('keeps map lettering readable against its halo', () => {
    expect(contrast(t.map.labelFill, t.map.labelHalo)).toBeGreaterThanOrEqual(7);
  });
  it('draws tiles as complete rectangles', () => {
    for (const spec of [t.map.ocean, t.map.wild]) {
      expect(new Set(spec.rows.map((r) => r.length)).size).toBe(1);
    }
    expect(new Set(t.map.mixRows.map((r) => r.length)).size).toBe(1);
  });
  it('never fills a realm with the sea colour', () => {
    const sea = t.map.ocean.colours['o'];
    for (const { a, b } of t.map.realms) expect([a, b]).not.toContain(sea);
  });
  it('has enough realm fills that neighbours rarely share one', () => {
    expect(new Set(t.map.realms.map((r) => r.a + r.b)).size).toBe(t.map.realms.length);
    expect(t.map.realms.length).toBeGreaterThanOrEqual(20);
  });
  it('renders swatches matching the map', () => {
    expect(themedFillCss(t, { a: '#112233', b: '#112233' })).toBe('#112233');
    expect(themedFillCss(t, null)).toContain('repeating-conic-gradient');
  });
});

describe('themeCss', () => {
  it('has a rule for every era, setting every custom property', () => {
    const css = themeCss();
    for (const t of THEMES) {
      expect(css).toContain(`:root[data-era='${t.id}']`);
    }
    expect(css).toContain('--key-a:');
    expect(css).toContain('--head-size:');
  });
});
