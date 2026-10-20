import { ADS_CLIENT } from '../config/site';

/** Google's authorised-seller record; empty comment until ads are switched on. */
export function GET(): Response {
  const pub = ADS_CLIENT.replace(/^ca-/, '');
  const body = pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` : '# ads disabled\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
