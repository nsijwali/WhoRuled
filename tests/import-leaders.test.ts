import { describe, expect, it } from 'vitest';
import { buildPolity, parseEntry, parseRawFile, yearFromFileName, type Row } from '../pipeline/import-leaders.ts';

const URL_2010 = 'https://en.wikipedia.org/wiki/List_of_state_leaders_in_the_2010s';
const URL_1914 = 'https://en.wikipedia.org/wiki/List_of_state_leaders_in_the_20th_century_(1901%E2%80%931950)';
const row = (year: number, lines: string[], url = year >= 2001 ? URL_2010 : URL_1914): Row => ({ year, wikiName: 'Testland', url, lines });

describe('parseEntry', () => {
  it('picks the period that covers the year', () => {
    const e = parseEntry('Hüseyin Özgürgün, acting Prime minister (2010), Prime minister (2016–2018)', 2010);
    expect(e).toMatchObject({ name: 'Hüseyin Özgürgün', title: 'acting Prime minister', from: 2010, to: 2010 });
    expect(parseEntry('Hüseyin Özgürgün, acting Prime minister (2010), Prime minister (2016–2018)', 2017)).toMatchObject({
      title: 'Prime minister',
      from: 2016,
      to: 2018,
    });
  });
  it('treats "present" as open-ended', () => {
    expect(parseEntry('Paul Biya, President (1982–present)', 2010)).toMatchObject({ from: 1982, to: null });
  });
  it('handles several terms in one bracket and circa years', () => {
    expect(parseEntry('William Charles Rogers, Principal Chief (1903–1905, 1906–1907)', 1906)).toMatchObject({ from: 1906, to: 1907 });
    expect(parseEntry('Rudolf Duala Manga Bell, King, Paramount Chief (c.1908–1913)', 1910)).toMatchObject({
      title: 'King, Paramount Chief',
      from: 1908,
      to: 1913,
    });
  });
  it('reads the full-date periods of the 2020s list', () => {
    expect(parseEntry('João Lourenço, president (since 26 September 2017)', 2026)).toMatchObject({
      name: 'João Lourenço',
      title: 'president',
      from: 2017,
      to: null,
    });
    expect(parseEntry('Saadeddine Othmani, prime minister (17 March 2017 – 7 October 2021)', 2026)).toBeNull();
    expect(parseEntry('Saadeddine Othmani, prime minister (17 March 2017 – 7 October 2021)', 2020)).toMatchObject({ from: 2017, to: 2021 });
    expect(
      parseEntry('Abdoulaye Maïga, interim prime minister (21 August 2022 – 5 December 2022, since 21 November 2024)', 2026),
    ).toMatchObject({ title: 'interim prime minister', from: 2024, to: null });
  });
  it('tolerates a missing space after the name', () => {
    expect(parseEntry('Sébastien Lecornu,prime minister (since 09 September 2025)', 2026)).toMatchObject({
      name: 'Sébastien Lecornu',
      title: 'prime minister',
      from: 2025,
    });
  });
  it('reads US-style dates', () => {
    expect(parseEntry('A B, supreme leader (since March 8, 2026)', 2026)).toMatchObject({ title: 'supreme leader', from: 2026, to: null });
  });
  it('takes the role that covers the year when one line holds several roles', () => {
    const line =
      'Sifi Ghrieb, acting prime minister (28 August 2025 – 14 September 2025); prime minister (since 14 September 2025)';
    expect(parseEntry(line, 2026)).toMatchObject({ title: 'prime minister', from: 2025, to: null, quote: line });
    const multi =
      'Assimi Goïta, chairman of the National Committee for the Salvation of the People (18 August 2020 – 25 September 2020), interim president (24 May 2021 – 8 July 2025), president (since 8 July 2025)';
    expect(parseEntry(multi, 2026)).toMatchObject({ title: 'president', from: 2025, to: null });
  });
  it('rejects rows outside the year or without a title', () => {
    expect(parseEntry('A B, King (1900–1950)', 2010)).toBeNull();
    expect(parseEntry('Nameless (2000–2020)', 2010)).toBeNull();
    expect(parseEntry('Manga Ndumbe Bell, King Paramount Chief (c.1897–?)', 1900)).toBeNull();
  });
});

describe('raw files', () => {
  it('takes the year from the file name', () => {
    expect(yearFromFileName('leaders-1914.txt')).toBe(1914);
    expect(yearFromFileName('leaders-bc500.txt')).toBe(-500);
    expect(yearFromFileName('notes.txt')).toBeNull();
  });
  it('reads the source header and rows', () => {
    const rows = parseRawFile(`# source: ${URL_1914}\nGerman Empire|Q43287|Wilhelm II, Emperor (1888–1918)\n`, 1914);
    expect(rows).toEqual([{ year: 1914, wikiName: 'German Empire', qid: 'Q43287', url: URL_1914, lines: ['Wilhelm II, Emperor (1888–1918)'] }]);
  });
  it('keeps "; " inside one list line and splits entries on a bare ";"', () => {
    const URL_2020S = 'https://en.wikipedia.org/wiki/List_of_state_leaders_in_the_2020s';
    const rows = parseRawFile(
      `# source: ${URL_2020S}\nAlgeria|Q262|A B, president (since 19 December 2019);C D, acting prime minister (28 August 2025 – 14 September 2025); prime minister (since 14 September 2025)\n`,
      2026,
    );
    expect(rows[0]?.lines).toEqual([
      'A B, president (since 19 December 2019)',
      'C D, acting prime minister (28 August 2025 – 14 September 2025); prime minister (since 14 September 2025)',
    ]);
  });
  it('reads an optional border name as the last field', () => {
    const rows = parseRawFile(`# source: ${URL_1914}\nAbyssinia|Q1|Lij Iyasu, Emperor (1913–1916)|Abyssinia\nSiam|Q2|Vajiravudh, King (1910–1925)|Rattanakosin Kingdom\n`, 1914);
    expect(rows.map((r) => r.border)).toEqual(['Abyssinia', 'Rattanakosin Kingdom']);
    expect(() => parseRawFile(`# source: ${URL_1914}\nA|Q1|B C, King (1900–1920)|`, 1914)).toThrow(/Bad row/);
    expect(() => parseRawFile(`# source: ${URL_1914}\nA|Q1|B C, King (1900–1920)|X|Y`, 1914)).toThrow(/Bad row/);
  });
  it('rejects a missing source header or a malformed row', () => {
    expect(() => parseRawFile('A|Q1|B C, King (1900–1920)', 1914)).toThrow(/source/);
    expect(() => parseRawFile(`# source: ${URL_1914}\nA|nope|B C, King (1900–1920)`, 1914)).toThrow(/Bad row/);
  });
});

describe('buildPolity', () => {
  it('uses the first ruler-like title as ruler and the rest as offices', () => {
    const p = buildPolity('Q1', [row(2010, ['X Y, High Representative (2009–2021)', 'A B, Chairman (2009–2012)', 'C D, Prime minister (2008–2012)'])], null);
    expect(p.rulers.map((r) => r.name)).toEqual(['A B']);
    expect(p.offices.map((o) => o.name)).toEqual(['X Y', 'C D']);
    expect(p.summary).toBe("Testland: office-holders in 2010, from Wikipedia's list of state leaders.");
    expect(p.review).toBeUndefined();
  });
  it('keeps curated rulers and does not duplicate them as offices', () => {
    const curatedRuler = { name: 'A B', title: 'president', from: 2000, to: 2020, source: { url: 'https://example.org/a-b', quote: 'A B was president' } };
    const existing = { qid: 'Q1', name: 'Curated', summary: 'Curated land.', rulers: [curatedRuler], offices: [], events: [] };
    const merged = buildPolity('Q1', [row(2010, ['A B, President (2000–2020)', 'C D, Prime minister (2008–2012)'])], existing);
    expect(merged.rulers).toEqual([curatedRuler]);
    expect(merged.offices.map((o) => o.name)).toEqual(['C D']);
    expect(merged.name).toBe('Curated');
    expect(merged.summary).toBe('Curated land.');
  });
  it('merges several years, one ruler per year, without duplicates', () => {
    const p = buildPolity(
      'Q1',
      [
        row(1920, ['George V, King (1910–1936)', 'David Lloyd George, Prime minister (1916–1922)']),
        row(1914, ['George V, King (1910–1936)', 'H. H. Asquith, Prime minister (1908–1916)']),
        row(2010, ['E F, President (2005–2015)']),
      ],
      null,
    );
    expect(p.rulers.map((r) => [r.name, r.source.url])).toEqual([
      ['George V', URL_1914],
      ['E F', URL_2010],
    ]);
    expect(p.offices.map((o) => o.name)).toEqual(['H. H. Asquith', 'David Lloyd George']);
    expect(p.summary).toBe("Testland: office-holders in 1914, 1920, 2010, from Wikipedia's lists of state leaders.");
  });
  it("lets a later year's incumbent rule when the earlier ruler's term ends that year", () => {
    const URL_2020S = 'https://en.wikipedia.org/wiki/List_of_state_leaders_in_the_2020s';
    const p = buildPolity(
      'Q20',
      [
        row(2010, ['Harald V, King (1991–2026)', 'Jens Stoltenberg, Prime minister (2005–2013)']),
        row(2026, ['Haakon VIII, king (since 28 August 2026)', 'Jonas Gahr Støre, prime minister (since 14 October 2021)'], URL_2020S),
      ],
      null,
    );
    expect(p.rulers.map((r) => [r.name, r.from, r.to])).toEqual([
      ['Harald V', 1991, 2026],
      ['Haakon VIII', 2026, null],
    ]);
    expect(p.offices.map((o) => o.name)).toEqual(['Jens Stoltenberg', 'Jonas Gahr Støre']);
  });
  it('puts the Wikidata description in a generated summary, never over a curated one', () => {
    const p = buildPolity('Q1', [row(1914, ['George V, King (1910–1936)'])], null, 'country in Europe.');
    expect(p.summary).toBe("Testland: country in Europe (Wikidata description). Office-holders in 1914, from Wikipedia's list of state leaders.");
    const again = buildPolity('Q1', [row(1914, ['George V, King (1910–1936)']), row(1920, ['George V, King (1910–1936)'])], p, 'country in Europe');
    expect(again.summary).toContain('Office-holders in 1914, 1920');
    const curated = { qid: 'Q1', name: 'Curated', summary: 'Curated land.', rulers: [], offices: [], events: [] };
    expect(buildPolity('Q1', [row(1914, ['George V, King (1910–1936)'])], curated, 'x').summary).toBe('Curated land.');
  });
  it('recognises its own BC summaries as generated', () => {
    const bc = buildPolity('Q1', [row(-500, ['Darius I, King (522–486)'])], null);
    expect(bc.summary).toBe("Testland: office-holders in 500 BC, from Wikipedia's list of state leaders.");
    expect(buildPolity('Q1', [row(-500, ['Darius I, King (522–486)'])], bc, 'empire').summary).toContain('(Wikidata description)');
  });
  it('regenerates earlier imports instead of piling them up', () => {
    const first = buildPolity('Q1', [row(1914, ['George V, King (1910–1936)', 'H. H. Asquith, Prime minister (1908–1916)'])], null);
    const again = buildPolity('Q1', [row(1914, ['George V, King (1910–1936)', 'H. H. Asquith, Prime minister (1908–1916)'])], first);
    expect(again).toEqual(first);
  });
});
