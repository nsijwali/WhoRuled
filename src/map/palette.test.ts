import { describe, expect, it } from 'vitest';
import { EGA, REALM_FILLS, fillCss, realmFill } from './palette';

describe('realmFill', () => {
  it('is stable and shared between an overlord and its subjects', () => {
    expect(realmFill('France', null)).toBe(realmFill('France', null));
    expect(realmFill('Normandy', 'France')).toBe(realmFill('France', null));
  });
  it('has no fill for unnamed land', () => {
    expect(realmFill(null, null)).toBeNull();
  });
  it('uses only EGA colours, and never the sea blues', () => {
    const allowed = new Set<string>(Object.values(EGA));
    for (const { a, b } of REALM_FILLS) {
      for (const c of [a, b]) {
        expect(allowed.has(c)).toBe(true);
        expect([EGA.blue, EGA.lightBlue]).not.toContain(c);
      }
    }
  });
  it('renders solid fills as a plain colour and mixed fills as a checkerboard', () => {
    expect(fillCss({ a: EGA.red, b: EGA.red })).toBe(EGA.red);
    expect(fillCss({ a: EGA.red, b: EGA.yellow })).toContain('repeating-conic-gradient');
  });
});
