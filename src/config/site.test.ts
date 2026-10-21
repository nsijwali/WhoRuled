import { describe, expect, it } from 'vitest';
import { paypalMeName } from './site';

describe('paypalMeName', () => {
  it.each([
    ['nitinsijwali', 'nitinsijwali'],
    ['paypal.me/nitinsijwali', 'nitinsijwali'],
    ['https://www.paypal.me/nitinsijwali/', 'nitinsijwali'],
    ['  HTTP://PayPal.me/Abc123  ', 'Abc123'],
  ])('accepts %s', (input, name) => expect(paypalMeName(input)).toBe(name));
  it.each(['', 'ab', 'a b c', 'name/5USD', 'https://evil.example/pay', 'x'.repeat(21), '<script>'])('rejects %j', (input) => {
    expect(paypalMeName(input)).toBe('');
  });
});
