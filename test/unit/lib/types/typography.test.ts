import assert from 'assert';
import { DEFAULT_TYPOGRAPHY, getResolvedStyle, type TypographyOptions } from '../../../../src/lib/types/typography.ts';

describe('typography types', () => {
  describe('getResolvedStyle', () => {
    it('correctly resolves styles using DEFAULT_TYPOGRAPHY', () => {
      const resolved = getResolvedStyle(DEFAULT_TYPOGRAPHY);

      assert.strictEqual(resolved.fontSize, DEFAULT_TYPOGRAPHY.content.fontSize);
      assert.strictEqual(
        resolved.lineGap,
        DEFAULT_TYPOGRAPHY.content.lineHeight * DEFAULT_TYPOGRAPHY.content.fontSize - DEFAULT_TYPOGRAPHY.content.fontSize
      );
      assert.strictEqual(resolved.paragraphMarginBottom, DEFAULT_TYPOGRAPHY.content.paragraphMarginBottom);
      assert.strictEqual(resolved.bulletMarginBottom, DEFAULT_TYPOGRAPHY.content.bulletMarginBottom);
      assert.strictEqual(resolved.bulletGap, DEFAULT_TYPOGRAPHY.content.bulletGap);
      assert.strictEqual(
        resolved.blockMarginBottom,
        DEFAULT_TYPOGRAPHY.content.bulletGap + DEFAULT_TYPOGRAPHY.content.bulletMarginBottom
      );
      assert.strictEqual(resolved.itemMarginBottom, DEFAULT_TYPOGRAPHY.content.itemMarginBottom);
    });

    it('correctly computes lineGap with a custom lineHeight', () => {
      const customTypography: TypographyOptions = {
        ...DEFAULT_TYPOGRAPHY,
        content: {
          ...DEFAULT_TYPOGRAPHY.content,
          fontSize: 12,
          lineHeight: 1.5,
          paragraphMarginBottom: 5,
          bulletMarginBottom: 3,
          bulletGap: 4,
          itemMarginBottom: 6,
        },
      };

      const resolved = getResolvedStyle(customTypography);

      assert.strictEqual(resolved.fontSize, 12);
      assert.strictEqual(resolved.lineGap, 1.5 * 12 - 12); // 6
      assert.strictEqual(resolved.paragraphMarginBottom, 5);
      assert.strictEqual(resolved.bulletMarginBottom, 3);
      assert.strictEqual(resolved.bulletGap, 4);
      assert.strictEqual(resolved.blockMarginBottom, 7); // 4 + 3
      assert.strictEqual(resolved.itemMarginBottom, 6);
    });

    it('falls back to default lineHeight 1.3 when lineHeight is undefined or null', () => {
      const customTypography: TypographyOptions = {
        ...DEFAULT_TYPOGRAPHY,
        content: {
          ...DEFAULT_TYPOGRAPHY.content,
          fontSize: 10,
          lineHeight: (undefined as unknown) as number,
        },
      };

      const resolved = getResolvedStyle(customTypography);

      // (1.3 * 10) - 10 = 3
      assert.strictEqual(resolved.lineGap, 3);
    });
  });
});
