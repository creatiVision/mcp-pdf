import { mcp } from '@mcp-z/mcp-pdf';
import { ProtocolError, ProtocolErrorCode } from '@mcp-z/server';
import assert from 'assert';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { safeRmSync } from 'fs-remove-compat';
import { join } from 'path';
import { fileURLToPath } from 'url';
import type { PDFOutput, PDFOutput as Output } from '../../../../src/lib/pdf-core.ts';
import type { Input } from '../../../../src/mcp/tools/pdf-document.ts';
import createTool from '../../../../src/mcp/tools/pdf-document.ts';
import { createExtra } from '../../../lib/create-extra.ts';
import { createTestConfig } from '../../../lib/create-test-config.ts';
import { DEJAVU_SANS, embeddedFontNames, pageContents, type TextRun, textRuns, writeDejaVuCollection } from '../../../lib/fixture-fonts.ts';

describe('pdf-document tool', () => {
  const testOutputDir = join(process.cwd(), '.tmp', 'pdf-document-tests');
  const testStorageDir = join(testOutputDir, 'storage');
  const imagePath = './resources/logo.png';
  const config = createTestConfig(testOutputDir, testStorageDir);
  const tool = createTool();
  const extra = createExtra(config);

  before(() => {
    mkdirSync(testStorageDir, { recursive: true });
  });

  after(() => {
    if (existsSync(testOutputDir)) {
      safeRmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('creates flowing PDF document with various content types', async () => {
    assert.equal(tool.name, 'pdf-document', 'tool name should match');

    const input: Input = {
      filename: 'sample-doc.pdf',
      title: 'Sample Document Title',
      author: 'Test Author',
      markdown: true,
      color: {
        background: '#ffffff',
        hyperlink: '#0066cc',
      },
      pageSetup: {
        size: 'LETTER',
      },
      content: [
        { type: 'heading', text: 'Section 1', fontSize: 20, bold: true },
        { type: 'text', text: 'This is body text with **bold** and *italic*.', moveDown: 1 },
        { type: 'divider', thickness: 2, color: '#000000', marginTop: 5, marginBottom: 5 },
        { type: 'spacer', height: 15 },
        { type: 'pageBreak' },
        { type: 'heading', text: 'Section 2', fontSize: 18 },
        { type: 'text', text: 'Text on page 2.' },
      ],
    };

    const result = await tool.handler(input, extra);

    assert.ok(result.structuredContent, 'should have structuredContent');
    const output = (result.structuredContent as { result?: { documentId: string; uri: string; pageCount: number; filename: string } } | undefined)?.result;
    assert.ok(output?.documentId, 'should have documentId');
    assert.ok(output?.uri, 'should have uri');
    assert.equal(output?.pageCount, 2, 'should have 2 pages');
    assert.equal(output?.filename, 'sample-doc.pdf', 'should preserve filename');
  });

  it('creates a PDF document with multiple flowing images', async () => {
    const input: Input = {
      filename: 'multi-image-doc.pdf',
      title: 'Multi Image Test',
      content: [
        { type: 'heading', text: 'Images Test' },
        { type: 'image', imagePath },
        { type: 'text', text: 'Some text between images' },
        { type: 'image', imagePath },
        { type: 'image', imagePath },
        { type: 'image', imagePath },
        { type: 'image', imagePath },
      ],
    };

    const result = await tool.handler(input, extra);

    assert.ok(result.structuredContent);
    const output = (result.structuredContent as { result?: unknown } | undefined)?.result as PDFOutput;
    assert.ok(output.documentId);
    assert.ok(output.uri);
    assert.ok(output.sizeBytes > 0);
    assert.equal(output.filename, 'multi-image-doc.pdf');
  });

  it('benchmarks handling document with 200 images', async () => {
    const imagesCount = 200;
    const content: Input['content'] = [{ type: 'heading', text: 'Benchmark 200 Images' }];
    for (let i = 0; i < imagesCount; i++) {
      content.push({ type: 'image', imagePath });
    }

    const input: Input = {
      filename: 'benchmark-doc.pdf',
      content,
    };

    const iterations = 5;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await tool.handler(input, extra);
    }
    const duration = performance.now() - start;
    const avgDuration = duration / iterations;

    console.log(`[BENCHMARK] ${imagesCount} images x ${iterations} iterations total: ${duration.toFixed(2)}ms, avg per run: ${avgDuration.toFixed(2)}ms`);
    assert.ok(avgDuration > 0);
  });

  it('handles tool creation via mcp toolFactories export', () => {
    const factoryTool = mcp.toolFactories.pdfDocument();
    assert.equal(factoryTool.name, 'pdf-document');
  });

  it('throws ProtocolError on internal PDF generation failure', async () => {
    const input: Input = {
      filename: 'failing-doc.pdf',
      content: [
        {
          type: 'image',
          imagePath: '/nonexistent/path/to/invalid-image.png',
        },
      ],
    };

    try {
      await tool.handler(input, extra);
      assert.fail('Should have thrown ProtocolError for non-existent image path');
    } catch (error) {
      assert.ok(error instanceof ProtocolError, 'Error should be an instance of ProtocolError');
      assert.strictEqual((error as ProtocolError).code, ProtocolErrorCode.InternalError, 'ErrorCode should be InternalError');
      assert.ok(error.message.includes('Error creating PDF document:'), `Expected 'Error creating PDF document:' in message, got: ${error.message}`);
      const data = error.data as { stack?: string } | undefined;
      assert.ok(data?.stack !== undefined, 'Should include stack in error data');
    }
  });

  it('wraps non-Error exceptions into ProtocolError', async () => {
    const input: Input = {
      content: [
        {
          type: 'image',
          imagePath: 'invalid://url-scheme-that-fails',
        },
      ],
    };

    try {
      await tool.handler(input, extra);
      assert.fail('Should have thrown ProtocolError');
    } catch (error) {
      assert.ok(error instanceof ProtocolError, 'Error should be an instance of ProtocolError');
      assert.strictEqual((error as ProtocolError).code, ProtocolErrorCode.InternalError, 'ErrorCode should be InternalError');
      assert.ok(error.message.startsWith('Error creating PDF document:'));
    }
  });
});

describe('pdf-document font option', () => {
  const testOutputDir = join(process.cwd(), '.tmp', 'pdf-document-tests');
  const testStorageDir = join(testOutputDir, 'storage');
  const tool = mcp.toolFactories.pdfDocument();
  const extra = createExtra(createTestConfig(testOutputDir, testStorageDir));

  before(() => mkdirSync(testStorageDir, { recursive: true }));
  after(() => {
    if (existsSync(testOutputDir)) safeRmSync(testOutputDir, { recursive: true, force: true });
  });

  async function run(input: Input): Promise<Output> {
    const result = await tool.handler(input, extra);
    return (result.structuredContent as { result: Output }).result;
  }

  it('renders with a font file and reports no warnings for covered text', async () => {
    const output = await run({ font: DEJAVU_SANS, markdown: true, content: [{ type: 'text', text: 'Привет **мир**' }] });
    assert.strictEqual(output.warnings, undefined);
    assert.deepStrictEqual([...new Set(embeddedFontNames(readFileSync(fileURLToPath(output.uri))))], ['DejaVuSans']);
  });

  it('warns about characters the font file lacks', async () => {
    const output = await run({ font: DEJAVU_SANS, content: [{ type: 'text', text: 'Hello 你好' }] });
    assert.ok(
      output.warnings?.some((w) => w.includes('"你"') && w.includes('DejaVuSans')),
      `warnings: ${JSON.stringify(output.warnings)}`
    );
  });

  it('refuses a font URL on a non-public address', async () => {
    await assert.rejects(tool.handler({ font: 'https://169.254.169.254/latest/font.ttf', content: [{ type: 'text', text: 'x' }] }, extra), /not a public address/);
  });

  it('warns that a standard font cannot render Cyrillic', async () => {
    const output = await run({ font: 'Helvetica', content: [{ type: 'text', text: 'Привет' }] });
    assert.ok(
      output.warnings?.some((w) => w.includes('Helvetica')),
      `warnings: ${JSON.stringify(output.warnings)}`
    );
  });
});

describe('pdf-document bold and italic', () => {
  const testOutputDir = join(process.cwd(), '.tmp', 'pdf-document-style-tests');
  const testStorageDir = join(testOutputDir, 'storage');
  const tool = mcp.toolFactories.pdfDocument();
  const extra = createExtra(createTestConfig(testOutputDir, testStorageDir));
  let collection: string;

  before(() => {
    mkdirSync(testStorageDir, { recursive: true });
    collection = writeDejaVuCollection(testOutputDir);
  });
  after(() => {
    if (existsSync(testOutputDir)) safeRmSync(testOutputDir, { recursive: true, force: true });
  });

  async function runs(input: Input): Promise<TextRun[]> {
    const result = await tool.handler(input, extra);
    return textRuns(readFileSync(fileURLToPath((result.structuredContent as { result: Output }).result.uri)));
  }

  it('fakes a bold heading and markdown styles with a one-style font', async () => {
    const drawn = await runs({
      font: DEJAVU_SANS,
      markdown: true,
      content: [
        { type: 'heading', text: 'Heading' },
        { type: 'text', text: 'plain **bold** *italic*' },
      ],
    });
    assert.deepStrictEqual(
      drawn.map(({ mode, oblique }) => ({ mode, oblique })),
      [
        { mode: 2, oblique: false },
        { mode: 0, oblique: false },
        { mode: 2, oblique: false },
        { mode: 0, oblique: false },
        { mode: 0, oblique: true },
      ]
    );
  });

  it('uses real faces from a collection', async () => {
    const drawn = await runs({
      font: collection,
      markdown: true,
      content: [
        { type: 'heading', text: 'Heading' },
        { type: 'text', text: 'plain **bold** *italic*' },
      ],
    });
    assert.deepStrictEqual(
      drawn.map((r) => r.font),
      ['DejaVuSans-Bold', 'DejaVuSans', 'DejaVuSans-Bold', 'DejaVuSans', 'DejaVuSans-Oblique']
    );
    assert.ok(drawn.every((r) => r.mode === 0 && !r.oblique));
  });
});

describe('pdf-document text options', () => {
  const testOutputDir = join(process.cwd(), '.tmp', 'pdf-document-option-tests');
  const testStorageDir = join(testOutputDir, 'storage');
  const tool = mcp.toolFactories.pdfDocument();
  const extra = createExtra(createTestConfig(testOutputDir, testStorageDir));

  before(() => mkdirSync(testStorageDir, { recursive: true }));
  after(() => {
    if (existsSync(testOutputDir)) safeRmSync(testOutputDir, { recursive: true, force: true });
  });

  async function pdfFor(input: Input): Promise<Buffer> {
    const result = await tool.handler(input, extra);
    return readFileSync(fileURLToPath((result.structuredContent as { result: Output }).result.uri));
  }

  it('parses markdown by default and draws it literally with markdown: false', async () => {
    const parsed = textRuns(await pdfFor({ font: 'Helvetica', content: [{ type: 'text', text: 'a **b**' }] }));
    assert.deepStrictEqual(
      parsed.map((r) => [r.font, r.text]),
      [
        ['Helvetica', 'a '],
        ['Helvetica-Bold', 'b'],
      ]
    );
    const literal = textRuns(await pdfFor({ font: 'Helvetica', markdown: false, content: [{ type: 'text', text: 'a **b**' }] }));
    assert.deepStrictEqual(
      literal.map((r) => [r.font, r.text]),
      [['Helvetica', 'a **b**']]
    );
  });

  it('applies color and oblique', async () => {
    const pdf = await pdfFor({ font: 'Helvetica', content: [{ type: 'text', text: 'Styled', color: '#ff0000', oblique: true }] });
    assert.deepStrictEqual(
      textRuns(pdf).map(({ fill, oblique }) => ({ fill, oblique })),
      [{ fill: '1 0 0', oblique: true }]
    );
  });

  it('applies underline and strike', async () => {
    for (const decoration of ['underline', 'strike'] as const) {
      const pdf = await pdfFor({ font: 'Helvetica', content: [{ type: 'text', text: 'Decorated', [decoration]: true }] });
      assert.match(pageContents(pdf).join('\n'), / l\nS\n/, `${decoration} line is stroked`);
    }
  });

  it('applies link', async () => {
    const pdf = await pdfFor({ font: 'Helvetica', content: [{ type: 'text', text: 'Site', link: 'https://example.com/' }] });
    assert.match(pdf.toString('latin1'), /\/URI \(https:\/\/example\.com\/\)/);
  });
});

describe('pdf-document images', () => {
  const testOutputDir = join(process.cwd(), '.tmp', 'pdf-document-image-tests');
  const testStorageDir = join(testOutputDir, 'storage');
  const tool = mcp.toolFactories.pdfDocument();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const localImage = join(testOutputDir, 'pixel.png');

  before(() => {
    mkdirSync(testStorageDir, { recursive: true });
    writeFileSync(localImage, png);
  });
  after(() => {
    if (existsSync(testOutputDir)) safeRmSync(testOutputDir, { recursive: true, force: true });
  });

  it('embeds a local image over stdio', async () => {
    const extra = createExtra(createTestConfig(testOutputDir, testStorageDir));
    const result = await tool.handler({ content: [{ type: 'image', imagePath: localImage, width: 20 }] }, extra);
    const pdf = readFileSync(fileURLToPath((result.structuredContent as { result: Output }).result.uri)).toString('latin1');
    assert.match(pdf, /\/Subtype \/Image/);
  });

  it('refuses a local image over http', async () => {
    const extra = createExtra(createTestConfig(testOutputDir, testStorageDir, { type: 'http', port: 1 }));
    await assert.rejects(tool.handler({ content: [{ type: 'image', imagePath: localImage, width: 20 }] }, extra), /only available when the server runs over stdio/);
  });
});
