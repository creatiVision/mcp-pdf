import { mcp } from '@mcp-z/mcp-pdf';
import assert from 'assert';
import { existsSync, mkdirSync } from 'fs';
import { safeRmSync } from 'fs-remove-compat';
import { join } from 'path';
import type { PDFOutput } from '../../../../src/lib/pdf-core.ts';
import type { Input } from '../../../../src/mcp/tools/pdf-document.ts';
import { createExtra } from '../../../lib/create-extra.ts';
import { createTestConfig } from '../../../lib/create-test-config.ts';

describe('pdf-document tool', () => {
  const testOutputDir = join(process.cwd(), '.tmp', 'pdf-document-tests');
  const testStorageDir = join(testOutputDir, 'storage');
  const imagePath = './resources/logo.png';

  before(() => {
    mkdirSync(testStorageDir, { recursive: true });
  });

  after(() => {
    if (existsSync(testOutputDir)) {
      safeRmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('creates a PDF document with multiple flowing images', async () => {
    const config = createTestConfig(testOutputDir, testStorageDir);
    const tool = mcp.toolFactories.pdfDocument();
    const extra = createExtra(config);

    assert.equal(tool.name, 'pdf-document');

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
    const config = createTestConfig(testOutputDir, testStorageDir);
    const tool = mcp.toolFactories.pdfDocument();
    const extra = createExtra(config);

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
});
