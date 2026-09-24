import assert from 'assert';
import PDFDocument from 'pdfkit';
import {
  createWidthMeasurer,
  measureCircleHeight,
  measureGroupHeight,
  measureImageHeight,
  measureLineHeight,
  measureMoveDown,
  measureRectHeight,
  measureTextHeight,
  measureTextWidth,
} from '../../../src/lib/content-measure.ts';
import type { LayoutContent } from '../../../src/lib/yoga-layout.ts';

describe('content-measure', () => {
  function createTestDoc(): PDFKit.PDFDocument {
    const doc = new PDFDocument({
      size: [612, 792],
      margins: { top: 50, bottom: 50, left: 54, right: 54 },
      autoFirstPage: false,
    });
    doc.addPage();
    return doc;
  }

  describe('measureTextHeight', () => {
    it('returns 0 for empty or whitespace-only text', () => {
      const doc = createTestDoc();
      assert.strictEqual(measureTextHeight(doc, '', 12, 'Helvetica', false), 0);
      assert.strictEqual(measureTextHeight(doc, '   \n \t  ', 12, 'Helvetica', false), 0);
      doc.end();
    });

    it('measures height for standard text without emoji', () => {
      const doc = createTestDoc();
      const height = measureTextHeight(doc, 'Hello world', 12, 'Helvetica', false);
      assert.ok(height > 0);
      doc.end();
    });

    it('uses width and lineGap from options', () => {
      const doc = createTestDoc();
      const height1 = measureTextHeight(doc, 'A quick brown fox jumps over the lazy dog repeatedly to test line wrapping logic', 12, 'Helvetica', false, { width: 100 });
      const height2 = measureTextHeight(doc, 'A quick brown fox jumps over the lazy dog repeatedly to test line wrapping logic', 12, 'Helvetica', false, { width: 100, lineGap: 10 });
      assert.ok(height2 > height1);
      doc.end();
    });

    it('accounts for indent in available width calculation', () => {
      const doc = createTestDoc();
      const height1 = measureTextHeight(doc, 'Short text', 12, 'Helvetica', false, { width: 100 });
      const height2 = measureTextHeight(doc, 'Short text', 12, 'Helvetica', false, { width: 100, indent: 50 });
      assert.ok(height2 >= height1);
      doc.end();
    });

    it('measures text height with emoji when emojiAvailable is true', () => {
      const doc = createTestDoc();
      const height = measureTextHeight(doc, 'Hello 👋 world 🚀', 12, 'Helvetica', true, { width: 200 });
      assert.ok(height > 0);
      doc.end();
    });

    it('restores font state (font and fontSize) after measurement', () => {
      const doc = createTestDoc();
      doc.font('Helvetica-Bold').fontSize(20);

      measureTextHeight(doc, 'Measurement text', 10, 'Helvetica', false);

      const pdfDoc = doc as unknown as { _font?: { name: string }; _fontSize?: number };
      assert.strictEqual(pdfDoc._font?.name, 'Helvetica-Bold');
      assert.strictEqual(pdfDoc._fontSize, 20);
      doc.end();
    });
  });

  describe('measureTextWidth', () => {
    it('returns 0 for empty or whitespace-only text', () => {
      const doc = createTestDoc();
      assert.strictEqual(measureTextWidth(doc, '', 12, 'Helvetica', false), 0);
      assert.strictEqual(measureTextWidth(doc, '   ', 12, 'Helvetica', false), 0);
      doc.end();
    });

    it('measures width for plain text', () => {
      const doc = createTestDoc();
      const width = measureTextWidth(doc, 'Hello World', 12, 'Helvetica', false);
      assert.ok(width > 0);
      doc.end();
    });

    it('measures width for text containing emoji', () => {
      const doc = createTestDoc();
      const plainWidth = measureTextWidth(doc, 'Hello ', 12, 'Helvetica', true);
      const emojiWidth = measureTextWidth(doc, 'Hello 🎉', 12, 'Helvetica', true);
      assert.ok(emojiWidth > plainWidth);
      doc.end();
    });

    it('restores font state after measurement', () => {
      const doc = createTestDoc();
      doc.font('Helvetica-Oblique').fontSize(16);

      measureTextWidth(doc, 'Test width', 10, 'Helvetica', false);

      const pdfDoc = doc as unknown as { _font?: { name: string }; _fontSize?: number };
      assert.strictEqual(pdfDoc._font?.name, 'Helvetica-Oblique');
      assert.strictEqual(pdfDoc._fontSize, 16);
      doc.end();
    });
  });

  describe('createWidthMeasurer', () => {
    it('returns 0 for non-text/heading content or empty text', () => {
      const doc = createTestDoc();
      const measurer = createWidthMeasurer(doc, 'Helvetica', 'Helvetica-Bold', false);

      assert.strictEqual(measurer({ type: 'rect', width: 100, height: 50 } as unknown as LayoutContent), 0);
      assert.strictEqual(measurer({ type: 'text', text: '' } as LayoutContent), 0);
      doc.end();
    });

    it('measures text and heading content width', () => {
      const doc = createTestDoc();
      const measurer = createWidthMeasurer(doc, 'Helvetica', 'Helvetica-Bold', false);

      const textContent: LayoutContent = { type: 'text', text: 'Sample text', fontSize: 12 };
      const headingContent: LayoutContent = { type: 'heading', text: 'Sample heading', level: 1, fontSize: 18 };

      assert.ok(measurer(textContent) > 0);
      assert.ok(measurer(headingContent) > 0);
      doc.end();
    });

    it('respects bold settings for font selection', () => {
      const doc = createTestDoc();
      const measurer = createWidthMeasurer(doc, 'Helvetica', 'Helvetica-Bold', false);

      const regularHeading: LayoutContent = { type: 'heading', text: 'Heading', bold: false };
      const boldText: LayoutContent = { type: 'text', text: 'Heading', bold: true };

      assert.ok(measurer(regularHeading) > 0);
      assert.ok(measurer(boldText) > 0);
      doc.end();
    });
  });

  describe('measureImageHeight', () => {
    it('returns specifiedHeight when provided', () => {
      assert.strictEqual(measureImageHeight(100, 200, 400, 300), 100);
      assert.strictEqual(measureImageHeight(150), 150);
    });

    it('calculates proportional height when specifiedWidth and natural dimensions are provided', () => {
      assert.strictEqual(measureImageHeight(undefined, 200, 400, 200), 100);
    });

    it('returns naturalHeight when specified height and width are undefined', () => {
      assert.strictEqual(measureImageHeight(undefined, undefined, 400, 300), 300);
    });

    it('returns 0 when no sufficient dimension information is provided', () => {
      assert.strictEqual(measureImageHeight(), 0);
      assert.strictEqual(measureImageHeight(undefined, 200), 0);
    });
  });

  describe('shape and layout measurement helpers', () => {
    it('measureRectHeight returns given height', () => {
      assert.strictEqual(measureRectHeight(45), 45);
    });

    it('measureCircleHeight returns radius * 2', () => {
      assert.strictEqual(measureCircleHeight(15), 30);
    });

    it('measureLineHeight returns absolute delta y', () => {
      assert.strictEqual(measureLineHeight(10, 50), 40);
      assert.strictEqual(measureLineHeight(100, 20), 80);
    });

    it('measureMoveDown calculates height based on current document line height', () => {
      const doc = createTestDoc();
      doc.fontSize(12);
      const expected = 2 * doc.currentLineHeight();
      assert.strictEqual(measureMoveDown(doc, 2), expected);
      doc.end();
    });

    it('measureGroupHeight calculates total height of items', () => {
      const items = [10, 20, 30];
      const total = measureGroupHeight(items, (item) => item * 2);
      assert.strictEqual(total, 120);
    });
  });
});
