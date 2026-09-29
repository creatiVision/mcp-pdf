import assert from 'assert';
import type PDFKit from 'pdfkit';
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

describe('content-measure', (): void => {
  // Mock PDFKit Document helper
  function createMockDoc() {
    let currentFont = 'Helvetica';
    let currentFontSize = 12;

    const doc = {
      _font: { name: currentFont },
      _fontSize: currentFontSize,
      page: {
        width: 612,
        height: 792,
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      },
      fontSize(size: number) {
        currentFontSize = size;
        (this as any)._fontSize = size;
        return this;
      },
      font(name: string) {
        currentFont = name;
        (this as any)._font = { name };
        return this;
      },
      heightOfString(text: string, options?: any) {
        // Simple mock calculation based on string length & width option
        const width = options?.width || 512;
        const lineCount = Math.max(1, Math.ceil((text.length * 7) / width));
        const lineGap = options?.lineGap || 0;
        return lineCount * (currentFontSize + 2 + lineGap);
      },
      widthOfString(text: string) {
        return text.length * 7;
      },
      currentLineHeight(includeGap = false) {
        return currentFontSize + (includeGap ? 2 : 0);
      },
    };

    return doc as unknown as PDFKit.PDFDocument;
  }

  describe('measureTextHeight', (): void => {
    it('returns 0 for empty or whitespace text', (): void => {
      const doc = createMockDoc();
      assert.strictEqual(measureTextHeight(doc, '', 12, 'Helvetica', false), 0);
      assert.strictEqual(measureTextHeight(doc, '   ', 12, 'Helvetica', false), 0);
      assert.strictEqual(measureTextHeight(doc, null as any, 12, 'Helvetica', false), 0);
    });

    it('measures plain text height without emoji and restores font state', (): void => {
      const doc = createMockDoc();
      const initialFont = (doc as any)._font.name;
      const initialFontSize = (doc as any)._fontSize;

      const height = measureTextHeight(doc, 'Hello world', 14, 'Helvetica-Bold', false);

      assert.ok(height > 0);
      assert.strictEqual((doc as any)._font.name, initialFont);
      assert.strictEqual((doc as any)._fontSize, initialFontSize);
    });

    it('measures text with options (width, indent, lineGap)', (): void => {
      const doc = createMockDoc();
      const height = measureTextHeight(doc, 'A quick brown fox jumps over the lazy dog', 12, 'Helvetica', false, {
        width: 100,
        indent: 10,
        lineGap: 4,
      });

      assert.ok(height > 0);
    });

    it('measures text with emoji available and emoji present', (): void => {
      const doc = createMockDoc();
      const heightWithEmoji = measureTextHeight(doc, 'Hello 😀 world with extra long text that wraps across lines', 12, 'Helvetica', true, {
        width: 100,
      });

      assert.ok(heightWithEmoji > 0);
    });
  });

  describe('measureTextWidth', (): void => {
    it('returns 0 for empty or whitespace text', (): void => {
      const doc = createMockDoc();
      assert.strictEqual(measureTextWidth(doc, '', 12, 'Helvetica', false), 0);
      assert.strictEqual(measureTextWidth(doc, '  \n\t ', 12, 'Helvetica', false), 0);
      assert.strictEqual(measureTextWidth(doc, undefined as any, 12, 'Helvetica', false), 0);
    });

    it('measures text width without emoji and restores font state', (): void => {
      const doc = createMockDoc();
      const initialFont = (doc as any)._font.name;
      const initialFontSize = (doc as any)._fontSize;

      const width = measureTextWidth(doc, 'Test string', 16, 'Times-Roman', false);

      assert.strictEqual(width, 'Test string'.length * 7);
      assert.strictEqual((doc as any)._font.name, initialFont);
      assert.strictEqual((doc as any)._fontSize, initialFontSize);
    });

    it('measures text width with emoji segments', (): void => {
      const doc = createMockDoc();
      const width = measureTextWidth(doc, 'Hello 🎉 World', 12, 'Helvetica', true);

      assert.ok(width > 0);
    });
  });

  describe('createWidthMeasurer', (): void => {
    it('returns a function that measures LayoutContent elements', (): void => {
      const doc = createMockDoc();
      const measurer = createWidthMeasurer(doc, 'Helvetica', 'Helvetica-Bold', true);

      // Non-text/heading types return 0
      assert.strictEqual(measurer({ type: 'image' } as any), 0);
      assert.strictEqual(measurer({ type: 'text', text: '' } as any), 0);

      // Text element with default font size
      const textWidth = measurer({ type: 'text', text: 'Sample' } as any);
      assert.ok(textWidth > 0);

      // Heading element with custom font size and bold font
      const headingWidth = measurer({ type: 'heading', text: 'Heading', fontSize: 20, bold: true } as any);
      assert.ok(headingWidth > 0);

      // Heading element with bold: false uses regular font
      const headingRegularWidth = measurer({ type: 'heading', text: 'Heading', fontSize: 20, bold: false } as any);
      assert.ok(headingRegularWidth > 0);
    });
  });

  describe('measureImageHeight', (): void => {
    it('returns specifiedHeight when provided', (): void => {
      assert.strictEqual(measureImageHeight(150, 100, 200, 400), 150);
    });

    it('calculates height from specifiedWidth and natural dimensions', (): void => {
      // 100 * (400 / 200) = 200
      assert.strictEqual(measureImageHeight(undefined, 100, 200, 400), 200);
    });

    it('returns naturalHeight when specifiedHeight and specifiedWidth are not provided', (): void => {
      assert.strictEqual(measureImageHeight(undefined, undefined, 200, 300), 300);
    });

    it('returns 0 when dimensions are unavailable', (): void => {
      assert.strictEqual(measureImageHeight(undefined, undefined, undefined, undefined), 0);
    });
  });

  describe('shape and layout measurement helpers', (): void => {
    it('measureRectHeight returns height', (): void => {
      assert.strictEqual(measureRectHeight(50), 50);
    });

    it('measureCircleHeight returns diameter', (): void => {
      assert.strictEqual(measureCircleHeight(25), 50);
    });

    it('measureLineHeight returns absolute difference between y1 and y2', (): void => {
      assert.strictEqual(measureLineHeight(10, 60), 50);
      assert.strictEqual(measureLineHeight(100, 40), 60);
    });

    it('measureMoveDown calculates height based on line height', (): void => {
      const doc = createMockDoc();
      // currentLineHeight() without gap returns 12
      assert.strictEqual(measureMoveDown(doc, 2), 24);
    });

    it('measureGroupHeight sums item heights', (): void => {
      const items = [10, 20, 30];
      const total = measureGroupHeight(items, (item) => item * 2);
      assert.strictEqual(total, 120);
    });
  });
});
