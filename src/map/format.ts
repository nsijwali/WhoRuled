/** A pre-filled GitHub issue for reporting a mistake about one state, in one year when known. Carries no personal data. */
export function correctionUrl(name: string | null, year: number | null): string {
  const subject = name ?? 'an unnamed territory';
  const when = year === null ? '' : formatYear(year);
  const body = `State: ${subject}\n${when ? `Year: ${when}\n` : ''}\nWhat is wrong, and what is right?\n\nSource (link or book):\n`;
  const query = new URLSearchParams({ title: `Correction: ${subject}${when ? `, ${when}` : ''}`, body });
  return `https://github.com/nsijwali/WhoRuled/issues/new?${query.toString()}`;
}

/** Human label for a snapshot year: negative years are BC. */
export function formatYear(year: number): string {
  return year < 0 ? `${-year} BC` : String(year);
}
