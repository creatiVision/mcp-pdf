import assert from 'assert';
import PDFDocument from 'pdfkit';
import { createWidthMeasurer, measureCircleHeight, measureGroupHeight, measureImageHeight, measureLineHeight, measureMoveDown, measureRectHeight, measureTextHeight, measureTextWidth } from '../../../src/lib/content-measure.ts';
import type { LayoutContent } from '../../../src/lib/yoga-layout.ts';

describe('content-measure utilities', () => {
  let doc: PDFKit.PDFDocument;

  beforeEach(() => {
    doc = new PDFDocument({ margin: 50 });
  });

  describe('measureTextHeight', () => {
    it('returns 0 for empty or whitespace-only text', () => {
      assert.strictEqual(measureTextHeight(doc, '', 12, 'Helvetica', false), 0);
      assert.strictEqual(measureTextHeight(doc, '   ', 12, 'Helvetica', false), 0);
      assert.strictEqual(measureTextHeight(doc, null as unknown as string, 12, 'Helvetica', false), 0);
    });

    it('measures height for plain text without emoji', () => {
      const height = measureTextHeight(doc, 'Hello world', 12, 'Helvetica', false);
      assert.ok(height > 0, 'Height should be greater than 0');
    });

    it('measures height with custom options (width, lineGap, indent)', () => {
      const normalHeight = measureTextHeight(doc, 'This is a longer piece of text that will wrap when given a narrow width.', 12, 'Helvetica', false, { width: 500 });
      const wrappedHeight = measureTextHeight(doc, 'This is a longer piece of text that will wrap when given a narrow width.', 12, 'Helvetica', false, { width: 100 });
      assert.ok(wrappedHeight > normalHeight, 'Wrapped text should have greater height');

      const heightWithLineGap = measureTextHeight(doc, 'Line 1\nLine 2', 12, 'Helvetica', false, { lineGap: 10 });
      const heightWithoutLineGap = measureTextHeight(doc, 'Line 1\nLine 2', 12, 'Helvetica', false, { lineGap: 0 });
      assert.ok(heightWithLineGap > heightWithoutLineGap, 'Text with lineGap should have greater height');

      const heightWithIndent = measureTextHeight(doc, 'Short text wrapped with huge indent', 12, 'Helvetica', false, { width: 100, indent: 80 });
      const heightNoIndent = measureTextHeight(doc, 'Short text wrapped with huge indent', 12, 'Helvetica', false, { width: 100, indent: 0 });
      assert.ok(heightWithIndent > heightNoIndent, 'Text with indent reducing available width should be taller');
    });

    it('measures height for text with emoji when emoji rendering is available', () => {
      const height = measureTextHeight(doc, 'Hello 😀 world with emoji that might wrap if long enough', 12, 'Helvetica', true, { width: 100 });
      assert.ok(height > 0, 'Emoji height should be greater than 0');
    });

    it('restores previous font and fontSize state', () => {
      doc.fontSize(18).font('Helvetica-Bold');
      const savedFont = (doc as unknown as { _font?: { name: string } })._font?.name;
      const savedFontSize = (doc as unknown as { _fontSize?: number })._fontSize;

      measureTextHeight(doc, 'Test restore font state', 10, 'Helvetica', false);

      const currentFont = (doc as unknown as { _font?: { name: string } })._font?.name;
      const currentFontSize = (doc as unknown as { _fontSize?: number })._fontSize;

      assert.strictEqual(currentFont, savedFont);
      assert.strictEqual(currentFontSize, savedFontSize);
    });
  });

  describe('measureTextWidth', () => {
    it('returns 0 for empty or whitespace-only text', () => {
      assert.strictEqual(measureTextWidth(doc, '', 12, 'Helvetica', false), 0);
      assert.strictEqual(measureTextWidth(doc, '   ', 12, 'Helvetica', false), 0);
      assert.strictEqual(measureTextWidth(doc, null as unknown as string, 12, 'Helvetica', false), 0);
    });

    it('measures width for plain text without emoji', () => {
      const width = measureTextWidth(doc, 'Hello world', 12, 'Helvetica', false);
      assert.ok(width > 0, 'Width should be greater than 0');

      const widerWidth = measureTextWidth(doc, 'Hello world', 24, 'Helvetica', false);
      assert.ok(widerWidth > width, 'Larger font size should yield greater width');
    });

    it('measures width for text with emoji when emoji rendering is enabled', () => {
      const plainWidth = measureTextWidth(doc, 'Hello  world', 12, 'Helvetica', true);
      const emojiWidth = measureTextWidth(doc, 'Hello 😀 world', 12, 'Helvetica', true);
      assert.ok(emojiWidth > plainWidth, 'Text with emoji should be wider than with spaces');
    });

    it('restores font and font size state', () => {
      doc.fontSize(14).font('Helvetica-Oblique');
      const savedFont = (doc as unknown as { _font?: { name: string } })._font?.name;
      const savedFontSize = (doc as unknown as { _fontSize?: number })._fontSize;

      measureTextWidth(doc, 'Restoration test', 10, 'Helvetica', false);

      const currentFont = (doc as unknown as { _font?: { name: string } })._font?.name;
      const currentFontSize = (doc as unknown as { _fontSize?: number })._fontSize;

      assert.strictEqual(currentFont, savedFont);
      assert.strictEqual(currentFontSize, savedFontSize);
    });
  });

  describe('createWidthMeasurer', () => {
    const regularFont = 'Helvetica';
    const boldFont = 'Helvetica-Bold';

    it('returns 0 for non-text and non-heading content or empty text', () => {
      const measurer = createWidthMeasurer(doc, regularFont, boldFont, false);

      assert.strictEqual(measurer({ type: 'rect', width: 100, height: 50 } as unknown as LayoutContent), 0);
      assert.strictEqual(measurer({ type: 'text', text: '' } as unknown as LayoutContent), 0);
    });

    it('measures text content using provided font settings or defaults', () => {
      const measurer = createWidthMeasurer(doc, regularFont, boldFont, false);

      const regularTextWidth = measurer({ type: 'text', text: 'Sample Text' } as unknown as LayoutContent);
      const boldTextWidth = measurer({ type: 'text', text: 'Sample Text', bold: true } as unknown as LayoutContent);

      assert.ok(regularTextWidth > 0);
      assert.ok(boldTextWidth > 0);

      const customSizeWidth = measurer({ type: 'text', text: 'Sample Text', fontSize: 20 } as unknown as LayoutContent);
      const defaultSizeWidth = measurer({ type: 'text', text: 'Sample Text' } as unknown as LayoutContent);
      assert.ok(customSizeWidth > defaultSizeWidth);
    });

    it('measures heading content using heading defaults and bold settings', () => {
      const measurer = createWidthMeasurer(doc, regularFont, boldFont, false);

      const defaultHeadingWidth = measurer({ type: 'heading', text: 'Heading Text' } as unknown as LayoutContent);
      const notBoldHeadingWidth = measurer({ type: 'heading', text: 'Heading Text', bold: false } as unknown as LayoutContent);

      assert.ok(defaultHeadingWidth > 0);
      assert.ok(notBoldHeadingWidth > 0);
    });
  });

  describe('measureImageHeight', () => {
    it('returns specified height if provided', () => {
      assert.strictEqual(measureImageHeight(150, 200, 1000, 500), 150);
      assert.strictEqual(measureImageHeight(150), 150);
    });

    it('calculates aspect ratio height if width and natural dimensions are provided', () => {
      // Natural 1000x500 (2:1 aspect ratio), specified width 200 => height 100
      assert.strictEqual(measureImageHeight(undefined, 200, 1000, 500), 100);
    });

    it('returns natural height if no specified dimensions but naturalHeight exists', () => {
      assert.strictEqual(measureImageHeight(undefined, undefined, 1000, 500), 500);
    });

    it('returns 0 when dimensions cannot be determined', () => {
      assert.strictEqual(measureImageHeight(undefined, 200, undefined, undefined), 0);
      assert.strictEqual(measureImageHeight(undefined, undefined, undefined, undefined), 0);
    });
  });

  describe('geometric & miscellaneous measurement helpers', () => {
    it('measureRectHeight returns height', () => {
      assert.strictEqual(measureRectHeight(42), 42);
    });

    it('measureCircleHeight returns diameter', () => {
      assert.strictEqual(measureCircleHeight(15), 30);
    });

    it('measureLineHeight returns absolute y distance', () => {
      assert.strictEqual(measureLineHeight(10, 50), 40);
      assert.strictEqual(measureLineHeight(50, 10), 40);
    });

    it('measureMoveDown returns points corresponding to doc line height', () => {
      const lineHeight = doc.currentLineHeight();
      assert.strictEqual(measureMoveDown(doc, 2), 2 * lineHeight);
    });

    it('measureGroupHeight sums heights of items', () => {
      const items = [10, 20, 30];
      const total = measureGroupHeight(items, (item) => item * 2);
      assert.strictEqual(total, 120);
    });
  });
});
