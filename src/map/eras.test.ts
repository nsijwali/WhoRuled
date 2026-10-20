import { describe, expect, it } from 'vitest';
import { eraOf } from './eras';

describe('eraOf', () => {
  it('maps years to eras at the boundaries', () => {
    expect(eraOf(-1000).name).toBe('Iron Age');
    expect(eraOf(-300).name).toBe('Classical World');
    expect(eraOf(1492).name).toBe('Age of Discovery');
    expect(eraOf(1914).name).toBe('World Wars');
    expect(eraOf(1945).name).toBe('Cold War');
    expect(eraOf(2010).name).toBe('Modern Age');
  });
});
