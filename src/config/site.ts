/**
 * Site-wide settings. Monetisation and analytics stay OFF until the owner fills in the values
 * below (or sets the matching PUBLIC_* environment variables at build time). See docs/MONETIZATION.md.
 */
const env = import.meta.env;

export const SITE_URL: string = env.PUBLIC_SITE_URL ?? 'https://whoruled.sijwalinitin.workers.dev';
export const SITE_NAME = 'WhoRuled';

/** Turns `name`, `paypal.me/name` or `https://www.paypal.me/name` into the bare PayPal.Me name, or '' if it is not one. */
export function paypalMeName(input: string): string {
  const name = input.trim().replace(/^(https?:\/\/)?(www\.)?paypal\.me\//i, '').replace(/\/+$/, '');
  return /^[A-Za-z0-9]{3,20}$/.test(name) ? name : '';
}

/** PayPal.Me name (the part after paypal.me/). A public handle, not a credential. Defaults to the owner's; set PUBLIC_PAYPAL_ME to '-' to switch the page off. */
export const PAYPAL_ME: string = paypalMeName(env.PUBLIC_PAYPAL_ME ?? 'sijwalinitin');

/** The support link in the menu: an explicit URL, else the PayPal support page when PayPal is set up. Empty = none. */
export const SUPPORT_URL: string = env.PUBLIC_SUPPORT_URL ?? (PAYPAL_ME ? '/support/' : '');

/** Cloudflare Web Analytics token (cookie-free page views). Empty = no analytics script. */
export const ANALYTICS_TOKEN: string = env.PUBLIC_CF_ANALYTICS_TOKEN ?? '';

/** AdSense publisher id such as ca-pub-1234567890123456. Empty = no ads, no ad script, no consent banner. */
export const ADS_CLIENT: string = env.PUBLIC_ADS_CLIENT ?? '';
