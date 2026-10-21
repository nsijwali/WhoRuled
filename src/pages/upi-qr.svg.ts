import qrcode from 'qrcode-generator';
import { UPI_ID } from '../config/site';

/** UPI payment URI. The id is already validated by upiId() (no characters needing escapes); the amount is left out so the payer chooses it. */
export function upiUri(id: string): string {
  return `upi://pay?pa=${id}&pn=WhoRuled&cu=INR`;
}

/** QR code SVG for the configured UPI address, generated at build time so no payment image lives in the repo. */
export function GET(): Response {
  let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';
  if (UPI_ID) {
    const qr = qrcode(0, 'M');
    qr.addData(upiUri(UPI_ID));
    qr.make();
    svg = qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true });
  }
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
}
