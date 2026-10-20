import { describe, expect, it } from 'vitest';
import { realmColour } from './palette';

describe('realmColour', () => {
  it('is stable and shared between an overlord and its subjects', () => {
    expect(realmColour('France', null)).toBe(realmColour('France', null));
    expect(realmColour('Normandy', 'France')).toBe(realmColour('France', null));
  });
  it('has no colour for unnamed land', () => {
    expect(realmColour(null, null)).toBeNull();
  });
});
