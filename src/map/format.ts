/** Human label for a snapshot year: negative years are BC. */
export function formatYear(year: number): string {
  return year < 0 ? `${-year} BC` : String(year);
}
