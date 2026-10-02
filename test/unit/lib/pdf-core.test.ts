import assert from 'assert';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, type PageSizePreset } from '../../../src/constants.ts';
import { resolvePageSize } from '../../../src/lib/pdf-core.ts';

describe('pdf-core', () => {
  describe('resolvePageSize', () => {
    it('returns DEFAULT_PAGE_SIZE when size is undefined', () => {
      const result = resolvePageSize(undefined);
      assert.deepStrictEqual(result, DEFAULT_PAGE_SIZE);
    });

    it('resolves preset string names correctly for all known presets', () => {
      for (const key of Object.keys(PAGE_SIZES) as PageSizePreset[]) {
        assert.deepStrictEqual(resolvePageSize(key), PAGE_SIZES[key]);
      }
    });

    it('resolves custom [width, height] dimensions tuple', () => {
      const customSize: [number, number] = [400, 600];
      const result = resolvePageSize(customSize);
      assert.deepStrictEqual(result, { width: 400, height: 600 });
    });

    it('resolves custom floating-point [width, height] dimensions tuple', () => {
      const customSize: [number, number] = [595.28, 841.89];
      const result = resolvePageSize(customSize);
      assert.deepStrictEqual(result, { width: 595.28, height: 841.89 });
    });

    it('handles boundary custom dimensions like [0, 0]', () => {
      const customSize: [number, number] = [0, 0];
      const result = resolvePageSize(customSize);
      assert.deepStrictEqual(result, { width: 0, height: 0 });
    });
  });
});
