import { mcp } from '@mcp-z/mcp-pdf';
import { ProtocolError, ProtocolErrorCode } from '@mcp-z/server';
import assert from 'assert';
import { existsSync, mkdirSync } from 'fs';
import { safeRmSync } from 'fs-remove-compat';
import { join } from 'path';
import type { PDFOutput } from '../../../../src/lib/pdf-core.ts';
import type { Input } from '../../../../src/mcp/tools/pdf-document.ts';
import createTool from '../../../../src/mcp/tools/pdf-document.ts';
import { createExtra } from '../../../lib/create-extra.ts';
import { createTestConfig } from '../../../lib/create-test-config.ts';

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
