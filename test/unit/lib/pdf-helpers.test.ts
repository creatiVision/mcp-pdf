import assert from 'assert';
import PDFDocument from 'pdfkit';
import { renderText, measureMarkdownTextHeight, TextRenderConfig } from '../../../src/lib/pdf-helpers.ts';
import type { FontConfig } from '../../../src/lib/types/typography.ts';

describe('pdf-helpers', () => {
  function createTestDoc(): PDFKit.PDFDocument {
    return new PDFDocument({
      size: [612, 792],
      margins: { top: 50, bottom: 50, left: 54, right: 54 },
      autoFirstPage: false,
    });
  }

  const sampleFonts: FontConfig = {
    regular: 'Helvetica',
    bold: 'Helvetica-Bold',
    italic: 'Helvetica-Oblique',
    boldItalic: 'Helvetica-BoldOblique',
  };

  describe('renderText', () => {
    it('renders simple plain text with basic typography config', () => {
      const doc = createTestDoc();
      doc.addPage();

      const config: TextRenderConfig = {
        typography: {
          fontSize: 12,
          fontName: 'Helvetica',
        },
      };

      renderText(doc, 'Hello World', config);
      assert.strictEqual(doc.x, 54);
      doc.end();
    });

    it('renders text with explicit layout coordinates (x, y)', () => {
      const doc = createTestDoc();
      doc.addPage();

      const config: TextRenderConfig = {
        typography: {
          fontSize: 14,
          fontName: 'Helvetica',
        },
        layout: {
          x: 100,
          y: 200,
          width: 300,
        },
      };

      renderText(doc, 'Positioned Text', config);
      assert.strictEqual(doc.x, 100);
      doc.end();
    });

    it('renders text with alignment, spacing, and moveDown options', () => {
      const doc = createTestDoc();
      doc.addPage();

      const config: TextRenderConfig = {
        typography: {
          fontSize: 12,
          fontName: 'Helvetica',
        },
        layout: {
          x: 54,
          y: 100,
          width: 500,
          align: 'center',
          indent: 20,
        },
        spacing: {
          lineGap: 4,
          paragraphGap: 8,
          moveDown: 1,
        },
      };

      renderText(doc, 'Centered Text with Indent', config);
      doc.end();
    });

    it('renders markdown formatted text (bold, italic, links)', () => {
      const doc = createTestDoc();
      doc.addPage();

      const config: TextRenderConfig = {
        typography: {
          fontSize: 12,
          fontName: 'Helvetica',
          fonts: sampleFonts,
        },
        color: {
          hyperlinkColor: '#FF0000',
        },
        features: {
          markdown: true,
        },
        layout: {
          width: 400,
        },
      };

      renderText(doc, 'This is **bold**, *italic*, and a [link](https://example.com)', config);
      doc.end();
    });

    it('renders text with emoji content', () => {
      const doc = createTestDoc();
      doc.addPage();

      const config: TextRenderConfig = {
        typography: {
          fontSize: 12,
          fontName: 'Helvetica',
        },
        features: {
          enableEmoji: true,
        },
        layout: {
          width: 400,
        },
      };

      renderText(doc, 'Hello 😀 World 🚀', config);
      doc.end();
    });

    it('renders combined emoji and markdown formatted text', () => {
      const doc = createTestDoc();
      doc.addPage();

      const config: TextRenderConfig = {
        typography: {
          fontSize: 12,
          fontName: 'Helvetica',
          fonts: sampleFonts,
        },
        features: {
          enableEmoji: true,
          markdown: true,
        },
        layout: {
          width: 400,
          align: 'right',
        },
      };

      renderText(doc, '🚀 **Bold Emoji** and [link 😀](https://example.com)', config);
      doc.end();
    });

    it('throws error when width is missing for markdown text rendering', () => {
      const doc = createTestDoc();
      doc.addPage();

      const config: TextRenderConfig = {
        typography: {
          fontSize: 12,
          fontName: 'Helvetica',
          fonts: sampleFonts,
        },
        features: {
          markdown: true,
        },
      };

      assert.throws(() => {
        renderText(doc, 'Some **bold** text without width', config);
      }, /width is required for markdown text rendering/);

      doc.end();
    });

    it('throws error when width is missing for emoji text rendering', () => {
      const doc = createTestDoc();
      doc.addPage();

      const config: TextRenderConfig = {
        typography: {
          fontSize: 12,
          fontName: 'Helvetica',
        },
        features: {
          enableEmoji: true,
        },
      };

      assert.throws(() => {
        renderText(doc, 'Text with emoji 😀 without width', config);
      }, /width is required for complex text rendering/);

      doc.end();
    });
  });

  describe('measureMarkdownTextHeight', () => {
    it('calculates height for plain text correctly', () => {
      const doc = createTestDoc();
      doc.addPage();

      const text = 'Simple plain text message';
      const width = 400;
      const fontSize = 12;
      const lineGap = 2;

      const measured = measureMarkdownTextHeight(doc, text, width, fontSize, lineGap, sampleFonts, true);
      const expected = doc.heightOfString(text, { width, lineGap });

      assert.strictEqual(measured, expected);
      doc.end();
    });

    it('calculates height for markdown formatted text (bold, italic, bold+italic)', () => {
      const doc = createTestDoc();
      doc.addPage();

      const text = 'This is a long text with **bold items** and *italic items* and ***bold italic items*** designed to wrap across multiple lines in the document layout.';
      const width = 150; // Narrow width to force wrapping
      const fontSize = 12;
      const lineGap = 4;

      const heightWithMarkdown = measureMarkdownTextHeight(doc, text, width, fontSize, lineGap, sampleFonts, true);
      assert.ok(heightWithMarkdown > 0);
      assert.ok(typeof heightWithMarkdown === 'number');

      // Without markdown parsing
      const heightPlain = measureMarkdownTextHeight(doc, text, width, fontSize, lineGap, sampleFonts, false);
      assert.ok(heightPlain > 0);

      doc.end();
    });

    it('returns zero height for empty string plain text', () => {
      const doc = createTestDoc();
      doc.addPage();

      const measured = measureMarkdownTextHeight(doc, '', 400, 12, 2, sampleFonts, false);
      assert.strictEqual(measured, 0);
      doc.end();
    });
  });
});
