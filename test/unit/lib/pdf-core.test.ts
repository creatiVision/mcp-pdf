import assert from 'assert';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '../../../src/constants.ts';
import { createPDFDocument, extractTextOptions, pdfOutputSchema, resolvePageSize, textBaseSchema, validateContentText } from '../../../src/lib/pdf-core.ts';

describe('pdf-core', () => {
  describe('Schemas', () => {
    it('validates textBaseSchema', () => {
      const valid = textBaseSchema.parse({
        text: 'Hello world',
        fontSize: 14,
        bold: true,
        color: '#ff0000',
        textAlign: 'center',
      });
      assert.strictEqual(valid.text, 'Hello world');
      assert.strictEqual(valid.fontSize, 14);
      assert.strictEqual(valid.bold, true);
      assert.strictEqual(valid.color, '#ff0000');
      assert.strictEqual(valid.textAlign, 'center');
    });

    it('validates pdfOutputSchema', () => {
      const valid = pdfOutputSchema.parse({
        operationSummary: 'Generated PDF',
        itemsProcessed: 5,
        itemsChanged: 5,
        completedAt: new Date().toISOString(),
        documentId: 'doc-123',
        filename: 'test.pdf',
        uri: 'file:///tmp/test.pdf',
        sizeBytes: 1024,
        pageCount: 1,
        warnings: [],
      });
      assert.strictEqual(valid.documentId, 'doc-123');
      assert.strictEqual(valid.sizeBytes, 1024);
    });
  });

  describe('resolvePageSize', () => {
    it('returns DEFAULT_PAGE_SIZE when size is undefined', () => {
      const size = resolvePageSize(undefined);
      assert.deepStrictEqual(size, DEFAULT_PAGE_SIZE);
    });

    it('resolves preset page sizes', () => {
      assert.deepStrictEqual(resolvePageSize('LETTER'), PAGE_SIZES.LETTER);
      assert.deepStrictEqual(resolvePageSize('A4'), PAGE_SIZES.A4);
      assert.deepStrictEqual(resolvePageSize('LEGAL'), PAGE_SIZES.LEGAL);
    });

    it('resolves custom [width, height] dimensions', () => {
      const customSize = resolvePageSize([400, 600]);
      assert.deepStrictEqual(customSize, { width: 400, height: 600 });
    });
  });

  describe('extractTextOptions', () => {
    it('extracts empty options for empty item', () => {
      const options = extractTextOptions({});
      assert.deepStrictEqual(options, {});
    });

    it('extracts all supported text options', () => {
      const item = {
        textAlign: 'center' as const,
        indent: 10,
        lineGap: 4,
        paragraphGap: 8,
        width: 300,
        underline: true,
        strike: false,
        oblique: true,
        link: 'https://example.com',
        characterSpacing: 1,
        wordSpacing: 2,
        continued: true,
        lineBreak: false,
      };

      const options = extractTextOptions(item);
      assert.deepStrictEqual(options, {
        align: 'center',
        indent: 10,
        lineGap: 4,
        paragraphGap: 8,
        width: 300,
        underline: true,
        strike: false,
        oblique: true,
        link: 'https://example.com',
        characterSpacing: 1,
        wordSpacing: 2,
        continued: true,
        lineBreak: false,
      });
    });

    it('ignores undefined properties', () => {
      const item = {
        textAlign: 'left' as const,
        indent: undefined,
      };
      const options = extractTextOptions(item);
      assert.deepStrictEqual(options, { align: 'left' });
    });
  });

  describe('validateContentText', () => {
    it('collects no warnings for standard supported ASCII text', () => {
      const warnings: string[] = [];
      const items = [
        { type: 'text', text: 'Hello World', bold: false },
        { type: 'heading', text: 'Section Title', bold: true },
      ];

      validateContentText(items, 'Helvetica', 'Helvetica-Bold', warnings);
      assert.strictEqual(warnings.length, 0);
    });

    it('collects warnings for unsupported characters in regular or bold text', () => {
      const warnings: string[] = [];
      const items = [
        { type: 'text', text: 'Unsupported CJK 你好 in standard font', bold: false },
        { type: 'heading', text: 'Unsupported CJK 世界 in bold font', bold: true },
        { type: 'other', text: 'Should be ignored' },
      ];

      validateContentText(items, 'Helvetica', 'Helvetica-Bold', warnings);
      assert.ok(warnings.length > 0, 'Expected warnings for CJK characters with Helvetica font');
    });

    it('recursively validates children items', () => {
      const warnings: string[] = [];
      const items = [
        {
          type: 'group',
          children: [{ type: 'text', text: 'Child item with CJK 你好', bold: false }],
        },
      ];

      validateContentText(items, 'Helvetica', 'Helvetica-Bold', warnings);
      assert.ok(warnings.length > 0, 'Expected warnings for nested children text');
    });
  });

  describe('createPDFDocument', () => {
    it('creates a PDFKit document setup with default options', async () => {
      const setup = await createPDFDocument({}, undefined, 'Plain text');

      assert.ok(setup.doc);
      assert.deepStrictEqual(setup.pageSize, DEFAULT_PAGE_SIZE);
      assert.strictEqual(setup.actualPageCount, 1);
      assert.strictEqual(setup.emojiAvailable, false);
      assert.deepStrictEqual(setup.warnings, []);

      // Finish document and verify buffer
      setup.doc.end();
      const buffer = await setup.pdfPromise;
      assert.ok(Buffer.isBuffer(buffer));
      assert.ok(buffer.length > 0);
    });

    it('handles document metadata, custom page size, margins, background color, and page tracking', async () => {
      const setup = await createPDFDocument(
        {
          title: 'Test Document',
          author: 'Test Author',
          subject: 'Test Subject',
          pageSize: 'A4',
          margins: { top: 20, bottom: 20, left: 20, right: 20 },
          backgroundColor: '#f0f0f0',
        },
        'Helvetica',
        'Hello World'
      );

      assert.deepStrictEqual(setup.pageSize, PAGE_SIZES.A4);
      assert.strictEqual(setup.actualPageCount, 1);

      // Add another page to test background color application and actualPageCount tracking
      setup.doc.addPage();
      assert.strictEqual(setup.actualPageCount, 2);

      setup.doc.end();
      const buffer = await setup.pdfPromise;
      assert.ok(buffer.length > 0);
    });

    it('detects emoji in content and attempts font setup', async () => {
      const setup = await createPDFDocument({}, 'Helvetica', 'Emoji test 🚀');
      assert.strictEqual(typeof setup.emojiAvailable, 'boolean');

      setup.doc.end();
      const buffer = await setup.pdfPromise;
      assert.ok(buffer.length > 0);
    });
  });
});
