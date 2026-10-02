import assert from 'assert';
import { calculateTenure, DEFAULT_FIELD_TEMPLATES, ensureString, formatDate, formatTenure, mergeFieldTemplates, paragraphsFromContent, registerFieldFilters, renderField } from '../../../src/lib/formatting.ts';

describe('formatting', (): void => {
  describe('ensureString', () => {
    it('returns string as-is', () => {
      assert.strictEqual(ensureString('hello'), 'hello');
      assert.strictEqual(ensureString(''), '');
    });

    it('returns empty string for null and undefined', () => {
      assert.strictEqual(ensureString(null), '');
      assert.strictEqual(ensureString(undefined), '');
    });

    it('converts non-string values to string', () => {
      assert.strictEqual(ensureString(123), '123');
      assert.strictEqual(ensureString(true), 'true');
      assert.strictEqual(ensureString(false), 'false');
      assert.strictEqual(ensureString({ toString: () => 'custom' }), 'custom');
    });
  });

  describe('paragraphsFromContent', () => {
    it('returns empty array when content is undefined or empty', () => {
      assert.deepStrictEqual(paragraphsFromContent(undefined), []);
      assert.deepStrictEqual(paragraphsFromContent(''), []);
    });

    it('filters out empty values when content is an array', () => {
      assert.deepStrictEqual(paragraphsFromContent(['Para 1', '', 'Para 2']), ['Para 1', 'Para 2']);
    });

    it('splits single string on double newlines and trims paragraphs', () => {
      const input = 'Paragraph 1\n\n  Paragraph 2  \n\n\nParagraph 3';
      assert.deepStrictEqual(paragraphsFromContent(input), ['Paragraph 1', 'Paragraph 2', 'Paragraph 3']);
    });
  });

  describe('formatTenure', (): void => {
    it('returns empty string for null or undefined start date', (): void => {
      assert.strictEqual(formatTenure(undefined, '2023-01'), '');
      assert.strictEqual(formatTenure(null, '2023-01'), '');
      assert.strictEqual(formatTenure('', '2023-01'), '');
    });

    it('returns empty string when start date cannot be parsed', (): void => {
      assert.strictEqual(formatTenure('invalid-date', '2023-01'), '');
    });

    it('returns empty string when end date cannot be parsed', (): void => {
      assert.strictEqual(formatTenure('2022-01', 'invalid-date'), '');
    });

    it('returns empty string when start date equals end date (0 yrs 0 mo)', (): void => {
      assert.strictEqual(formatTenure('2023-01', '2023-01'), '');
      assert.strictEqual(formatTenure('2023-01-15', '2023-01-20'), '');
    });

    it('formats tenure under 1 year (months only)', (): void => {
      assert.strictEqual(formatTenure('2023-01', '2023-06'), '5 mo');
      assert.strictEqual(formatTenure('2023-01', '2023-02'), '1 mo');
      assert.strictEqual(formatTenure('2023-01', '2023-12'), '11 mo');
    });

    it('formats tenure of exactly 1 year', (): void => {
      assert.strictEqual(formatTenure('2022-01', '2023-01'), '1 yr');
    });

    it('formats tenure of multiple years with 0 months', (): void => {
      assert.strictEqual(formatTenure('2020-01', '2022-01'), '2 yrs');
      assert.strictEqual(formatTenure('2018-05', '2023-05'), '5 yrs');
    });

    it('formats tenure with 1 year and months', (): void => {
      assert.strictEqual(formatTenure('2022-01', '2023-04'), '1 yr 3 mo');
      assert.strictEqual(formatTenure('2022-01', '2023-02'), '1 yr 1 mo');
    });

    it('formats tenure with multiple years and months', (): void => {
      assert.strictEqual(formatTenure('2020-01', '2023-07'), '3 yrs 6 mo');
      assert.strictEqual(formatTenure('2019-03', '2022-04'), '3 yrs 1 mo');
    });

    it('handles all singular and plural combinations of years and months correctly', (): void => {
      // 0 yrs 1 mo
      assert.strictEqual(formatTenure('2023-01', '2023-02'), '1 mo');
      // 0 yrs 2 mo
      assert.strictEqual(formatTenure('2023-01', '2023-03'), '2 mo');
      // 1 yr 0 mo
      assert.strictEqual(formatTenure('2022-01', '2023-01'), '1 yr');
      // 2 yrs 0 mo
      assert.strictEqual(formatTenure('2021-01', '2023-01'), '2 yrs');
      // 1 yr 1 mo
      assert.strictEqual(formatTenure('2022-01', '2023-02'), '1 yr 1 mo');
      // 1 yr 2 mo
      assert.strictEqual(formatTenure('2022-01', '2023-03'), '1 yr 2 mo');
      // 2 yrs 1 mo
      assert.strictEqual(formatTenure('2021-01', '2023-02'), '2 yrs 1 mo');
      // 2 yrs 2 mo
      assert.strictEqual(formatTenure('2021-01', '2023-03'), '2 yrs 2 mo');
    });

    it('defaults end date to current date when end date is omitted, empty string, or null/undefined', (): void => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      // Create a start date 2 years prior to current year/month
      const startYear = year - 2;
      const startMonthStr = String(month).padStart(2, '0');
      const startDateStr = `${startYear}-${startMonthStr}`;

      assert.strictEqual(formatTenure(startDateStr, undefined), '2 yrs');
      assert.strictEqual(formatTenure(startDateStr, null), '2 yrs');
      assert.strictEqual(formatTenure(startDateStr, ''), '2 yrs');
    });

    it('handles mixed date formats (e.g. YYYY and YYYY-MM-DD)', (): void => {
      assert.strictEqual(formatTenure('2020', '2022-06'), '2 yrs 5 mo');
      assert.strictEqual(formatTenure('2020-03-15', '2022'), '1 yr 10 mo');
    });

    it('returns empty string when end date is earlier than start date', (): void => {
      assert.strictEqual(formatTenure('2023-05', '2021-01'), '');
    });

    it('handles YYYY date format', (): void => {
      assert.strictEqual(formatTenure('2020', '2022'), '2 yrs');
    });

    it('handles YYYY-MM-DD date format', (): void => {
      assert.strictEqual(formatTenure('2020-01-15', '2022-01-10'), '2 yrs');
    });

    it('handles future start date when end date is omitted', (): void => {
      const now = new Date();
      const futureYear = now.getFullYear() + 5;
      assert.strictEqual(formatTenure(`${futureYear}-01`, undefined), '');
    });

    it('handles mixed date format inputs', (): void => {
      assert.strictEqual(formatTenure('2020', '2021-06'), '1 yr 5 mo');
      assert.strictEqual(formatTenure('2020-01-15', '2021'), '1 yr');
    });
  });

  describe('calculateTenure', (): void => {
    it('returns null for empty or invalid start date', (): void => {
      assert.strictEqual(calculateTenure(undefined, '2023-01'), null);
      assert.strictEqual(calculateTenure(null, '2023-01'), null);
      assert.strictEqual(calculateTenure('', '2023-01'), null);
      assert.strictEqual(calculateTenure('invalid', '2023-01'), null);
    });

    it('returns null for invalid end date', (): void => {
      assert.strictEqual(calculateTenure('2023-01', 'invalid'), null);
    });

    it('calculates totalMonths, years, and months correctly', (): void => {
      const res = calculateTenure('2020-01', '2022-07');
      assert.deepStrictEqual(res, { years: 2, months: 6, totalMonths: 30 });
    });

    it('caps totalMonths at 0 when end date is before start date', (): void => {
      const res = calculateTenure('2023-05', '2021-01');
      assert.deepStrictEqual(res, { years: 0, months: 0, totalMonths: 0 });
    });

    it('defaults end date to current date when end date is omitted or empty', (): void => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const startYear = year - 1;
      const startMonthStr = String(month).padStart(2, '0');
      const startDateStr = `${startYear}-${startMonthStr}`;

      const resUndefined = calculateTenure(startDateStr, undefined);
      assert.deepStrictEqual(resUndefined, { years: 1, months: 0, totalMonths: 12 });

      const resEmpty = calculateTenure(startDateStr, '');
      assert.deepStrictEqual(resEmpty, { years: 1, months: 0, totalMonths: 12 });
    });
  });

  describe('formatDate', (): void => {
    it('returns empty string for null or undefined date', (): void => {
      assert.strictEqual(formatDate(undefined, 'YYYY-MM-DD'), '');
      assert.strictEqual(formatDate(null, 'YYYY-MM-DD'), '');
    });

    it('returns original string if format cannot parse date', (): void => {
      assert.strictEqual(formatDate('not-a-date', 'YYYY-MM-DD'), 'not-a-date');
    });

    it('formats full dates YYYY-MM-DD', (): void => {
      assert.strictEqual(formatDate('2023-05-15', 'MMMM D, YYYY'), 'May 15, 2023');
      assert.strictEqual(formatDate('2023-05-05', 'MMM DD, YY'), 'May 05, 23');
    });

    it('formats partial dates YYYY-MM', (): void => {
      assert.strictEqual(formatDate('2023-05', 'MMM YYYY'), 'May 2023');
      assert.strictEqual(formatDate('2023-05', 'MMMM YYYY'), 'May 2023');
      assert.strictEqual(formatDate('2023-05', 'M/YY'), '5/23');
    });

    it('formats year-only dates YYYY', (): void => {
      assert.strictEqual(formatDate('2023', 'YYYY'), '2023');
      assert.strictEqual(formatDate('2023', 'MMM YYYY'), 'Jan 2023');
    });
  });

  describe('mergeFieldTemplates', (): void => {
    it('returns default templates when user templates are omitted', (): void => {
      const merged = mergeFieldTemplates();
      assert.deepStrictEqual(merged, DEFAULT_FIELD_TEMPLATES);
    });

    it('overrides default templates with provided user templates', (): void => {
      const merged = mergeFieldTemplates({
        location: '{{ city }}',
      });
      assert.strictEqual(merged.location, '{{ city }}');
      assert.strictEqual(merged.degree, DEFAULT_FIELD_TEMPLATES.degree);
    });
  });

  describe('renderField and Liquid filters', (): void => {
    before((): void => {
      registerFieldFilters();
    });

    it('allows calling registerFieldFilters multiple times safely', (): void => {
      assert.doesNotThrow(() => registerFieldFilters());
    });

    it('renders basic liquid field templates', (): void => {
      const result = renderField(DEFAULT_FIELD_TEMPLATES.location, { city: 'San Francisco', region: 'CA' });
      assert.strictEqual(result, 'San Francisco, CA');
    });

    it('uses date filter in template', (): void => {
      const result = renderField("{{ start | date: 'MMM YYYY' }}", { start: '2020-01-15' });
      assert.strictEqual(result, 'Jan 2020');
    });

    it('uses default filter in template', (): void => {
      const result = renderField("{{ end | default: 'Present' }}", { end: null });
      assert.strictEqual(result, 'Present');
    });

    it('uses tenure filter in template with start and end dates', (): void => {
      const result = renderField('{{ start | tenure: end }}', { start: '2020-01', end: '2022-01' });
      assert.strictEqual(result, '2 yrs');
    });

    it('handles tenure filter with empty or missing dates', (): void => {
      assert.strictEqual(renderField('{{ start | tenure: end }}', { start: null, end: '2022-01' }), '');
      assert.strictEqual(renderField('{{ start | tenure }}', { start: null }), '');
    });
  });
});
