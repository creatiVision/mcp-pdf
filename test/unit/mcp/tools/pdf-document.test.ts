import { mcp } from '@mcp-z/mcp-pdf';
import { ProtocolError, ProtocolErrorCode } from '@mcp-z/server';
import assert from 'assert';
import { existsSync, mkdirSync } from 'fs';
import { safeRmSync } from 'fs-remove-compat';
import { join } from 'path';
import type { Input } from '../../../../src/mcp/tools/pdf-document.ts';
import createTool from '../../../../src/mcp/tools/pdf-document.ts';
import { createExtra } from '../../../lib/create-extra.ts';
import { createTestConfig } from '../../../lib/create-test-config.ts';

describe('pdf-document tool', () => {
  const testOutputDir = join(process.cwd(), '.tmp', 'pdf-document-tests');
  const testStorageDir = join(testOutputDir, 'storage');
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
      assert.ok(error.data?.stack !== undefined, 'Should include stack in error data');
    }
  });

  it('wraps non-Error exceptions into ProtocolError', async () => {
    // Create input with invalid imagePath that causes resolveImageDimensions to reject
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
