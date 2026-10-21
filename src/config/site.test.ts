import { describe, expect, it } from 'vitest';
import { paypalMeName, upiId } from './site';

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

describe('upiId', () => {
  it.each(['9910731705@ybl', 'name.surname@okhdfcbank', 'a-b_c@paytm'])('accepts %s', (id) => expect(upiId(id)).toBe(id));
  it.each(['', 'nobank', '@ybl', 'a@b', 'x y@ybl', 'a@ybl&am=1000', 'upi://pay?pa=x@y'])('rejects %j', (id) => {
    expect(upiId(id)).toBe('');
  });
});
