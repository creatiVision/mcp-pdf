import assert from 'assert';
import {
  DEFAULT_HEADING_FONT_SIZE,
  DEFAULT_MARGINS_BY_SIZE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_TEXT_FONT_SIZE,
  getDefaultMargins,
  PAGE_SIZES,
  RESUME_DEFAULT_MARGINS,
  WRAP_EPSILON,
} from '../../src/constants.ts';

describe('constants', () => {
  describe('PAGE_SIZES', () => {
    it('defines standard page dimensions in points', () => {
      assert.deepStrictEqual(PAGE_SIZES.LETTER, { width: 612, height: 792 });
      assert.deepStrictEqual(PAGE_SIZES.A4, { width: 595, height: 842 });
      assert.deepStrictEqual(PAGE_SIZES.LEGAL, { width: 612, height: 1008 });
    });
  });

  describe('DEFAULT_PAGE_SIZE', () => {
    it('defaults to US Letter size', () => {
      assert.strictEqual(DEFAULT_PAGE_SIZE, PAGE_SIZES.LETTER);
    });
  });

  describe('DEFAULT_MARGINS_BY_SIZE', () => {
    it('defines default margins for LETTER, A4, and LEGAL presets', () => {
      assert.deepStrictEqual(DEFAULT_MARGINS_BY_SIZE.LETTER, { top: 72, bottom: 72, left: 72, right: 72 });
      assert.deepStrictEqual(DEFAULT_MARGINS_BY_SIZE.A4, { top: 71, bottom: 71, left: 57, right: 57 });
      assert.deepStrictEqual(DEFAULT_MARGINS_BY_SIZE.LEGAL, { top: 72, bottom: 72, left: 72, right: 72 });
    });
  });

  describe('getDefaultMargins', () => {
    it('returns DEFAULT_MARGINS_BY_SIZE for LETTER by default', () => {
      const margins = getDefaultMargins();
      assert.deepStrictEqual(margins, DEFAULT_MARGINS_BY_SIZE.LETTER);
    });

    it('returns correct default margins for specified page sizes', () => {
      assert.deepStrictEqual(getDefaultMargins('LETTER'), DEFAULT_MARGINS_BY_SIZE.LETTER);
      assert.deepStrictEqual(getDefaultMargins('A4'), DEFAULT_MARGINS_BY_SIZE.A4);
      assert.deepStrictEqual(getDefaultMargins('LEGAL'), DEFAULT_MARGINS_BY_SIZE.LEGAL);
    });
  });

  describe('RESUME_DEFAULT_MARGINS', () => {
    it('defines tighter margins for resume documents', () => {
      assert.deepStrictEqual(RESUME_DEFAULT_MARGINS, {
        top: 50,
        right: 54,
        bottom: 50,
        left: 54,
      });
    });
  });

  describe('Font size and layout constants', () => {
    it('defines expected numerical constants', () => {
      assert.strictEqual(WRAP_EPSILON, 0.5);
      assert.strictEqual(DEFAULT_TEXT_FONT_SIZE, 12);
      assert.strictEqual(DEFAULT_HEADING_FONT_SIZE, 24);
    });
  });
});
