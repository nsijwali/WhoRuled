import { describe, expect, it } from 'vitest';
import { amazonTag, booksUrl, paypalMeName, upiId } from './site';

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

describe('amazon links', () => {
  it('accepts store ids and rejects anything else', () => {
    expect(amazonTag(' whoruled-21 ')).toBe('whoruled-21');
    for (const bad of ['', 'a b', 'x&tag=evil', 'ab', '<s>']) expect(amazonTag(bad)).toBe('');
  });
  it('builds a book search that carries the tag and survives odd names', () => {
    const url = new URL(booksUrl('Austria-Hungary & Co', 'whoruled-21'));
    expect(url.hostname).toBe('www.amazon.in');
    expect(url.searchParams.get('tag')).toBe('whoruled-21');
    expect(url.searchParams.get('k')).toBe('Austria-Hungary & Co history');
  });
});
