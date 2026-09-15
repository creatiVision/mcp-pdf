import assert from 'assert';
import PDFDocument from 'pdfkit';
import { measureMarkdownTextHeight, renderText, type TextRenderConfig } from '../../../src/lib/pdf-helpers.ts';
import type { FontConfig } from '../../../src/lib/types/typography.ts';

describe('style-search benchmark', () => {
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

  it('benchmarks markdown style searching performance', () => {
    const doc = createTestDoc();
    doc.addPage();

    // Construct a document with hundreds of styled ranges
    const segments: string[] = [];
    for (let i = 0; i < 200; i++) {
      segments.push(`Word${i} **bold${i}** *italic${i}* ***bolditalic${i}*** [link${i}](https://example.com/${i})`);
    }
    const text = segments.join(' ');

    const config: TextRenderConfig = {
      typography: {
        fontSize: 12,
        fontName: 'Helvetica',
        fonts: sampleFonts,
      },
      features: {
        markdown: true,
      },
      layout: {
        width: 500,
      },
    };

    const iterations = 50;

    // Benchmark measureMarkdownTextHeight
    const startMeasure = performance.now();
    for (let i = 0; i < iterations; i++) {
      measureMarkdownTextHeight(doc, text, 500, 12, 2, sampleFonts, true);
    }
    const elapsedMeasure = performance.now() - startMeasure;

    // Benchmark renderText
    const startRender = performance.now();
    for (let i = 0; i < iterations; i++) {
      renderText(doc, text, config);
    }
    const elapsedRender = performance.now() - startRender;

    console.log(`[BENCHMARK] measureMarkdownTextHeight (${iterations} iterations): ${elapsedMeasure.toFixed(2)} ms`);
    console.log(`[BENCHMARK] renderText (${iterations} iterations): ${elapsedRender.toFixed(2)} ms`);

    assert.ok(elapsedMeasure >= 0);
    assert.ok(elapsedRender >= 0);

    doc.end();
  });
});
