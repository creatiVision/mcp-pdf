import assert from 'assert';
import { calculateTenure, DEFAULT_FIELD_TEMPLATES, formatDate, formatTenure, mergeFieldTemplates, registerFieldFilters, renderField } from '../../../src/lib/formatting.ts';

describe('Formatting utilities', () => {
  describe('DEFAULT_FIELD_TEMPLATES', () => {
    it('contains expected default template definitions', () => {
      assert.strictEqual(typeof DEFAULT_FIELD_TEMPLATES.location, 'string');
      assert.strictEqual(typeof DEFAULT_FIELD_TEMPLATES.dateRange, 'string');
      assert.strictEqual(typeof DEFAULT_FIELD_TEMPLATES.degree, 'string');
      assert.strictEqual(typeof DEFAULT_FIELD_TEMPLATES.contactLine, 'string');
      assert.strictEqual(typeof DEFAULT_FIELD_TEMPLATES.credential, 'string');
      assert.strictEqual(typeof DEFAULT_FIELD_TEMPLATES.language, 'string');
      assert.strictEqual(typeof DEFAULT_FIELD_TEMPLATES.skill, 'string');
      assert.strictEqual(typeof DEFAULT_FIELD_TEMPLATES.url, 'string');
    });
  });

  describe('formatDate', () => {
    it('returns empty string for null, undefined, or empty date input', () => {
      assert.strictEqual(formatDate(null, 'YYYY-MM-DD'), '');
      assert.strictEqual(formatDate(undefined, 'YYYY-MM-DD'), '');
      assert.strictEqual(formatDate('', 'YYYY-MM-DD'), '');
    });

    it('returns raw string as-is if unparseable', () => {
      assert.strictEqual(formatDate('invalid-date', 'YYYY-MM-DD'), 'invalid-date');
      assert.strictEqual(formatDate('2023/01/01', 'YYYY-MM-DD'), '2023/01/01');
      assert.strictEqual(formatDate('2023-1', 'YYYY-MM'), '2023-1');
    });

    it('formats YYYY-MM-DD correctly with various tokens', () => {
      assert.strictEqual(formatDate('2023-05-15', 'YYYY-MM-DD'), '2023-05-15');
      assert.strictEqual(formatDate('2023-05-15', 'YY/M/D'), '23/5/15');
      assert.strictEqual(formatDate('2023-05-15', 'MMMM D, YYYY'), 'May 15, 2023');
      assert.strictEqual(formatDate('2023-05-15', 'MMM YYYY'), 'May 2023');
      assert.strictEqual(formatDate('2023-05-04', 'D/M/YY'), '4/5/23');
      assert.strictEqual(formatDate('2023-05-04', 'DD/MM/YYYY'), '04/05/2023');
    });

    it('formats YYYY-MM correctly (without day component)', () => {
      assert.strictEqual(formatDate('2023-11', 'MM/YYYY'), '11/2023');
      assert.strictEqual(formatDate('2023-11', 'MMMM YYYY'), 'November 2023');
      assert.strictEqual(formatDate('2023-11', 'MMM YYYY'), 'Nov 2023');
      assert.strictEqual(formatDate('2023-11', 'DD/MM/YYYY'), '/11/2023');
    });

    it('formats YYYY correctly (defaults month to January)', () => {
      assert.strictEqual(formatDate('2020', 'YYYY'), '2020');
      assert.strictEqual(formatDate('2020', 'MMM YYYY'), 'Jan 2020');
      assert.strictEqual(formatDate('2020', 'MMMM YYYY'), 'January 2020');
    });

    it('formats all months correctly (short and full names)', () => {
      const dates = ['2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01', '2024-05-01', '2024-06-01', '2024-07-01', '2024-08-01', '2024-09-01', '2024-10-01', '2024-11-01', '2024-12-01'];
      const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

      dates.forEach((d, idx) => {
        assert.strictEqual(formatDate(d, 'MMM'), shortMonths[idx]);
        assert.strictEqual(formatDate(d, 'MMMM'), fullMonths[idx]);
      });
    });

    it('handles out of range month numbers gracefully', () => {
      assert.strictEqual(formatDate('2024-00-01', 'MMM YYYY'), '2024');
      assert.strictEqual(formatDate('2024-13-01', 'MMMM YYYY'), '2024');
    });
  });

  describe('calculateTenure', () => {
    it('returns null if start date is missing or unparseable', () => {
      assert.strictEqual(calculateTenure(null, '2023-01'), null);
      assert.strictEqual(calculateTenure(undefined, '2023-01'), null);
      assert.strictEqual(calculateTenure('', '2023-01'), null);
      assert.strictEqual(calculateTenure('invalid', '2023-01'), null);
    });

    it('returns null if end date is provided but unparseable', () => {
      assert.strictEqual(calculateTenure('2020-01', 'invalid-end'), null);
    });

    it('calculates tenure accurately between start and end date', () => {
      // 2 years, 5 months = 29 months
      const result = calculateTenure('2020-01', '2022-06');
      assert.deepStrictEqual(result, { years: 2, months: 5, totalMonths: 29 });
    });

    it('calculates tenure accurately when YYYY-MM-DD or YYYY is passed', () => {
      const fullDateResult = calculateTenure('2020-01-15', '2022-06-20');
      assert.deepStrictEqual(fullDateResult, { years: 2, months: 5, totalMonths: 29 });

      const yearOnlyResult = calculateTenure('2020', '2022');
      assert.deepStrictEqual(yearOnlyResult, { years: 2, months: 0, totalMonths: 24 });
    });

    it('handles exact year boundaries', () => {
      const result = calculateTenure('2020-01', '2023-01');
      assert.deepStrictEqual(result, { years: 3, months: 0, totalMonths: 36 });
    });

    it('handles months-only tenure', () => {
      const result = calculateTenure('2023-01', '2023-07');
      assert.deepStrictEqual(result, { years: 0, months: 6, totalMonths: 6 });
    });

    it('returns 0 totalMonths when end date is earlier than start date', () => {
      const result = calculateTenure('2023-01', '2020-01');
      assert.deepStrictEqual(result, { years: 0, months: 0, totalMonths: 0 });
    });

    it('uses current date when end date is omitted or empty', () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // Start date 1 year ago
      const startYear = currentYear - 1;
      const startDateStr = `${startYear}-${String(currentMonth).padStart(2, '0')}`;

      const resultNull = calculateTenure(startDateStr, null);
      assert.ok(resultNull !== null);
      assert.strictEqual(resultNull.years, 1);
      assert.strictEqual(resultNull.months, 0);
      assert.strictEqual(resultNull.totalMonths, 12);

      const resultUndefined = calculateTenure(startDateStr, undefined);
      assert.ok(resultUndefined !== null);
      assert.strictEqual(resultUndefined.years, 1);

      const resultEmpty = calculateTenure(startDateStr, '');
      assert.ok(resultEmpty !== null);
      assert.strictEqual(resultEmpty.years, 1);
    });
  });

  describe('formatTenure', () => {
    it('returns empty string for invalid start date or zero tenure', () => {
      assert.strictEqual(formatTenure(null, '2023-01'), '');
      assert.strictEqual(formatTenure('2023-01', '2023-01'), '');
      assert.strictEqual(formatTenure('2023-01', '2020-01'), '');
      assert.strictEqual(formatTenure('invalid', '2023-01'), '');
    });

    it('formats months-only tenure', () => {
      assert.strictEqual(formatTenure('2023-01', '2023-06'), '5 mo');
    });

    it('formats single year tenure', () => {
      assert.strictEqual(formatTenure('2020-01', '2021-01'), '1 yr');
    });

    it('formats multiple years tenure', () => {
      assert.strictEqual(formatTenure('2020-01', '2023-01'), '3 yrs');
    });

    it('formats combined years and months tenure', () => {
      assert.strictEqual(formatTenure('2020-01', '2021-06'), '1 yr 5 mo');
      assert.strictEqual(formatTenure('2020-01', '2023-08'), '3 yrs 7 mo');
    });
  });

  describe('mergeFieldTemplates', () => {
    it('returns default field templates when no custom templates provided', () => {
      const merged = mergeFieldTemplates();
      assert.deepStrictEqual(merged, DEFAULT_FIELD_TEMPLATES);
    });

    it('overrides defaults with user provided templates', () => {
      const customLocation = '{{ city }} ({{ region }})';
      const merged = mergeFieldTemplates({ location: customLocation });

      assert.strictEqual(merged.location, customLocation);
      assert.strictEqual(merged.degree, DEFAULT_FIELD_TEMPLATES.degree);
    });
  });

  describe('renderField', () => {
    it('renders liquid template with provided context', () => {
      const template = '{{ city }}, {{ region }}';
      const result = renderField(template, { city: 'San Francisco', region: 'CA' });
      assert.strictEqual(result, 'San Francisco, CA');
    });

    it('trims leading and trailing whitespace from rendered string', () => {
      const template = '   {{ name }}   ';
      const result = renderField(template, { name: 'Alice' });
      assert.strictEqual(result, 'Alice');
    });
  });

  describe('registerFieldFilters', () => {
    it('registers custom liquid filters for date, default, and tenure', () => {
      registerFieldFilters();

      // Test date filter
      const dateResult = renderField("{{ start | date: 'MMM YYYY' }}", { start: '2021-04-10' });
      assert.strictEqual(dateResult, 'Apr 2021');

      const dateDefaultFormatResult = renderField("{{ start | date }}", { start: '2021-04-10' });
      assert.strictEqual(dateDefaultFormatResult, 'Apr 2021');

      const dateEmptyResult = renderField("{{ start | date: 'MMM YYYY' }}", { start: null });
      assert.strictEqual(dateEmptyResult, '');

      // Test default filter
      const defaultVal = renderField("{{ missing | default: 'N/A' }}", {});
      assert.strictEqual(defaultVal, 'N/A');

      const defaultNullVal = renderField("{{ missing | default: 'N/A' }}", { missing: null });
      assert.strictEqual(defaultNullVal, 'N/A');

      const defaultEmptyStringVal = renderField("{{ missing | default: 'N/A' }}", { missing: '' });
      assert.strictEqual(defaultEmptyStringVal, 'N/A');

      const defaultNoFallbackVal = renderField("{{ missing | default }}", { missing: null });
      assert.strictEqual(defaultNoFallbackVal, '');

      const existingVal = renderField("{{ present | default: 'N/A' }}", { present: 'Exists' });
      assert.strictEqual(existingVal, 'Exists');

      // Test tenure filter
      const tenureVal = renderField('{{ start | tenure: end }}', { start: '2020-01', end: '2022-04' });
      assert.strictEqual(tenureVal, '2 yrs 3 mo');

      const tenureEmptyStartVal = renderField("{{ start | tenure: end }}", { start: null, end: '2022-04' });
      assert.strictEqual(tenureEmptyStartVal, '');
    });

    it('is safe to call multiple times (idempotent)', () => {
      assert.doesNotThrow(() => {
        registerFieldFilters();
        registerFieldFilters();
      });
    });
  });
});
