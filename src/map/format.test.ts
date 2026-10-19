import { describe, expect, it } from 'vitest';
import { formatYear } from './format';

describe('formatYear', () => {
  it('labels negative years as BC', () => {
    expect(formatYear(-500)).toBe('500 BC');
  });
  it('leaves positive years as-is', () => {
    expect(formatYear(1492)).toBe('1492');
  });
});
