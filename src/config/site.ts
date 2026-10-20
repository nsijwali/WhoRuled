/**
 * Site-wide settings. Monetisation and analytics stay OFF until the owner fills in the values
 * below (or sets the matching PUBLIC_* environment variables at build time). See docs/MONETIZATION.md.
 */
const env = import.meta.env;

export const SITE_URL: string = env.PUBLIC_SITE_URL ?? 'https://whoruled.sijwalinitin.workers.dev';
export const SITE_NAME = 'WhoRuled';

/** Donation / sponsor page, e.g. https://github.com/sponsors/nsijwali. Empty = no support link. */
export const SUPPORT_URL: string = env.PUBLIC_SUPPORT_URL ?? '';

/** Cloudflare Web Analytics token (cookie-free page views). Empty = no analytics script. */
export const ANALYTICS_TOKEN: string = env.PUBLIC_CF_ANALYTICS_TOKEN ?? '';

/** AdSense publisher id such as ca-pub-1234567890123456. Empty = no ads, no ad script, no consent banner. */
export const ADS_CLIENT: string = env.PUBLIC_ADS_CLIENT ?? '';
