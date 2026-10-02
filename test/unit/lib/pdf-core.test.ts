import assert from 'assert';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, type PageSizePreset } from '../../../src/constants.ts';
import { resolvePageSize } from '../../../src/lib/pdf-core.ts';

describe('pdf-core', () => {
  describe('resolvePageSize', () => {
    it('returns DEFAULT_PAGE_SIZE when size is undefined', () => {
      const result = resolvePageSize(undefined);
      assert.deepStrictEqual(result, DEFAULT_PAGE_SIZE);
    });

    it('resolves preset string names correctly', () => {
      for (const preset of Object.keys(PAGE_SIZES) as PageSizePreset[]) {
        assert.deepStrictEqual(resolvePageSize(preset), PAGE_SIZES[preset]);
      }
    });

    it('resolves custom [width, height] dimensions tuple', () => {
      const customSize: [number, number] = [400, 600];
      const result = resolvePageSize(customSize);
      assert.deepStrictEqual(result, { width: 400, height: 600 });
    });

    it('handles zero or floating point custom dimensions', () => {
      assert.deepStrictEqual(resolvePageSize([0, 0]), { width: 0, height: 0 });
      assert.deepStrictEqual(resolvePageSize([595.28, 841.89]), { width: 595.28, height: 841.89 });
    });
  });
});
