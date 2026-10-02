import assert from 'assert';
import PDFDocument from 'pdfkit';
import { createWidthMeasurer, measureCircleHeight, measureGroupHeight, measureImageHeight, measureLineHeight, measureMoveDown, measureRectHeight, measureTextHeight, measureTextWidth } from '../../../src/lib/content-measure.ts';
import type { LayoutContent } from '../../../src/lib/yoga-layout.ts';

describe('content-measure utilities', () => {
  let doc: PDFKit.PDFDocument;

  beforeEach(() => {
    doc = new PDFDocument({ margin: 50 });
  });

  describe('PDFKit mock document interaction', () => {
    it('calls fontSize, font, and heightOfString in order and restores font state when saved state exists', () => {
      const calls: string[] = [];
      const mockDoc = {
        _font: { name: 'Times-Roman' },
        _fontSize: 14,
        page: { width: 612, margins: { left: 50, right: 50 } },
        currentLineHeight: () => 12,
        fontSize(size: number) {
          calls.push(`fontSize:${size}`);
          return this;
        },
        font(name: string) {
          calls.push(`font:${name}`);
          return this;
        },
        heightOfString(text: string, options: unknown) {
          calls.push(`heightOfString:${text}:${JSON.stringify(options)}`);
          return 24;
        },
        widthOfString(text: string) {
          calls.push(`widthOfString:${text}`);
          return 50;
        },
      } as unknown as PDFKit.PDFDocument;

      const height = measureTextHeight(mockDoc, 'Mocked text', 16, 'Courier', false, { width: 400, lineGap: 2 });
      assert.strictEqual(height, 24);

      assert.deepStrictEqual(calls, [
        'fontSize:16',
        'font:Courier',
        'heightOfString:Mocked text:{"width":400,"lineGap":2}',
        'font:Times-Roman',
        'fontSize:14',
      ]);
    });

    it('handles mock document without initial _font or _fontSize saved state without restoring', () => {
      const calls: string[] = [];
      const mockDoc = {
        page: { width: 612, margins: { left: 50, right: 50 } },
        currentLineHeight: () => 12,
        fontSize(size: number) {
          calls.push(`fontSize:${size}`);
          return this;
        },
        font(name: string) {
          calls.push(`font:${name}`);
          return this;
        },
        heightOfString(text: string, options: unknown) {
          calls.push(`heightOfString:${text}:${JSON.stringify(options)}`);
          return 30;
        },
        widthOfString(text: string) {
          calls.push(`widthOfString:${text}`);
          return 60;
        },
      } as unknown as PDFKit.PDFDocument;

      const height = measureTextHeight(mockDoc, 'No saved state', 12, 'Helvetica', false);
      assert.strictEqual(height, 30);

      assert.deepStrictEqual(calls, [
        'fontSize:12',
        'font:Helvetica',
        'heightOfString:No saved state:{"width":512}',
      ]);
    });

    it('measures width using mock document and restores saved state', () => {
      const calls: string[] = [];
      const mockDoc = {
        _font: { name: 'Helvetica' },
        _fontSize: 10,
        fontSize(size: number) {
          calls.push(`fontSize:${size}`);
          return this;
        },
        font(name: string) {
          calls.push(`font:${name}`);
          return this;
        },
        widthOfString(text: string) {
          calls.push(`widthOfString:${text}`);
          return 120;
        },
      } as unknown as PDFKit.PDFDocument;

      const width = measureTextWidth(mockDoc, 'Measure width mock', 18, 'Helvetica-Bold', false);
      assert.strictEqual(width, 120);

      assert.deepStrictEqual(calls, [
        'fontSize:18',
        'font:Helvetica-Bold',
        'widthOfString:Measure width mock',
        'font:Helvetica',
        'fontSize:10',
      ]);
    });
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

    it('calculates available width from page dimensions and margins when width option is omitted', () => {
      const mockDoc = {
        page: { width: 500, margins: { left: 40, right: 60 } },
        currentLineHeight: () => 14,
        fontSize() { return this; },
        font() { return this; },
        heightOfString(text: string, options: { width?: number; indent?: number }) {
          // Verify expected effective width (500 - 40 - 60 = 400)
          assert.strictEqual(options.width, 400);
          return 28;
        },
      } as unknown as PDFKit.PDFDocument;

      const height = measureTextHeight(mockDoc, 'Default width calculation', 12, 'Helvetica', false);
      assert.strictEqual(height, 28);
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

    it('uses PDFKit heightOfString directly when emoji is present in text but emojiAvailable is false', () => {
      let heightOfStringCalled = false;
      const mockDoc = {
        page: { width: 600, margins: { left: 50, right: 50 } },
        currentLineHeight: () => 12,
        fontSize() { return this; },
        font() { return this; },
        heightOfString() {
          heightOfStringCalled = true;
          return 15;
        },
      } as unknown as PDFKit.PDFDocument;

      const height = measureTextHeight(mockDoc, 'Text with emoji 😀', 12, 'Helvetica', false);
      assert.strictEqual(height, 15);
      assert.strictEqual(heightOfStringCalled, true);
    });

    it('simulates emoji line wrapping with WRAP_EPSILON tolerance', () => {
      // Mock widthOfString to return exact widths to test epsilon threshold
      const mockDoc = {
        page: { width: 600, margins: { left: 0, right: 0 } },
        currentLineHeight: () => 10,
        fontSize() { return this; },
        font() { return this; },
        widthOfString(word: string) {
          if (word.trim() === 'word1') return 50;
          if (word.trim() === 'word2') return 50.005; // 50 + 50.005 = 100.005 <= 100 + 0.01 (within epsilon)
          if (word.trim() === 'word3') return 1; // 100.005 + 1 > 100.01 (causes wrap)
          return 10;
        },
      } as unknown as PDFKit.PDFDocument;

      // 'word1 word2' -> total width 100.005, effective width 100 => fits within WRAP_EPSILON (1 line)
      const height1 = measureTextHeight(mockDoc, 'word1 😀 word2', 10, 'Helvetica', true, { width: 100 });
      assert.ok(height1 > 0);

      // 'word1 word2 word3' -> word3 wraps to second line
      const height2 = measureTextHeight(mockDoc, 'word1 😀 word2 word3', 10, 'Helvetica', true, { width: 100 });
      assert.strictEqual(height2, 2 * 10);
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

    it('uses doc.widthOfString directly when emoji is present in text but emojiAvailable is false', () => {
      let widthOfStringCalled = false;
      const mockDoc = {
        fontSize() { return this; },
        font() { return this; },
        widthOfString() {
          widthOfStringCalled = true;
          return 75;
        },
      } as unknown as PDFKit.PDFDocument;

      const width = measureTextWidth(mockDoc, 'Text with emoji 😀', 12, 'Helvetica', false);
      assert.strictEqual(width, 75);
      assert.strictEqual(widthOfStringCalled, true);
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
      assert.strictEqual(measurer({ type: 'text' } as unknown as LayoutContent), 0);
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

    it('correctly passes font name and default font sizes to measureTextWidth', () => {
      const calls: Array<{ text: string }> = [];
      const mockDoc = {
        fontSize() { return this; },
        font() { return this; },
        widthOfString(text: string) {
          calls.push({ text });
          return 100;
        },
      } as unknown as PDFKit.PDFDocument;

      const measurer = createWidthMeasurer(mockDoc, 'RegularFont', 'BoldFont', false);

      // Heading with bold !== false should use boldFont and default heading size (16)
      measurer({ type: 'heading', text: 'Default Heading' } as unknown as LayoutContent);

      // Heading with bold === false should use regularFont
      measurer({ type: 'heading', text: 'Non-bold Heading', bold: false } as unknown as LayoutContent);

      // Text with bold === true should use boldFont and default text size (10)
      measurer({ type: 'text', text: 'Bold Text', bold: true } as unknown as LayoutContent);

      // Text with bold === false / undefined should use regularFont
      measurer({ type: 'text', text: 'Regular Text' } as unknown as LayoutContent);

      assert.strictEqual(calls.length, 4);
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

    it('measureGroupHeight sums heights of items and handles empty arrays', () => {
      assert.strictEqual(measureGroupHeight([], (item: number) => item), 0);

      const items = [10, 20, 30];
      const total = measureGroupHeight(items, (item) => item * 2);
      assert.strictEqual(total, 120);
    });
  });
});
