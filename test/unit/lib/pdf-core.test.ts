import assert from 'assert';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '../../../src/constants.ts';
import { resolvePageSize } from '../../../src/lib/pdf-core.ts';

describe('pdf-core', () => {
  describe('resolvePageSize', () => {
    it('returns DEFAULT_PAGE_SIZE when size is undefined', () => {
      const result = resolvePageSize(undefined);
      assert.deepStrictEqual(result, DEFAULT_PAGE_SIZE);
    });

    it('resolves preset string names correctly', () => {
      assert.deepStrictEqual(resolvePageSize('LETTER'), PAGE_SIZES.LETTER);
      assert.deepStrictEqual(resolvePageSize('A4'), PAGE_SIZES.A4);
      assert.deepStrictEqual(resolvePageSize('LEGAL'), PAGE_SIZES.LEGAL);
    });

    it('resolves custom [width, height] dimensions tuple', () => {
      const customSize: [number, number] = [400, 600];
      const result = resolvePageSize(customSize);
      assert.deepStrictEqual(result, { width: 400, height: 600 });
    });

    it('handles zero and floating point dimensions tuple', () => {
      assert.deepStrictEqual(resolvePageSize([0, 0]), { width: 0, height: 0 });
      assert.deepStrictEqual(resolvePageSize([100.5, 200.25]), { width: 100.5, height: 200.25 });
    });
  });
});
