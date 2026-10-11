import { mcp } from '@mcp-z/mcp-pdf';
import assert from 'assert';
import { existsSync, mkdirSync } from 'fs';
import { safeRmSync } from 'fs-remove-compat';
import { join } from 'path';
import type { Input } from '../../../../src/mcp/tools/pdf-layout.ts';
import type { ContentItem } from '../../../../src/schemas/layout.ts';
import { createExtra } from '../../../lib/create-extra.ts';
import { createTestConfig } from '../../../lib/create-test-config.ts';

describe('pdf-layout benchmark', () => {
  const testOutputDir = join(process.cwd(), '.tmp', 'benchmark-tests');
  const testStorageDir = join(testOutputDir, 'storage');
  const config = createTestConfig(testOutputDir, testStorageDir);
  const tool = mcp.toolFactories.pdfLayout();
  const extra = createExtra(config);

  before(() => {
    mkdirSync(testStorageDir, { recursive: true });
  });

  after(() => {
    if (existsSync(testOutputDir)) {
      safeRmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('measures layout rendering performance', async () => {
    // Generate a layout input with deep group nesting and many items
    const generateNestedGroups = (depth: number, width: number): ContentItem[] => {
      if (depth === 0) {
        return [
          { type: 'heading', text: 'Section Header', fontSize: 14 },
          { type: 'text', text: 'Some body text explaining details in this block.' },
          { type: 'rect', left: 0, top: 0, width: 100, height: 20, fillColor: '#e0e0e0' },
          { type: 'circle', left: 0, top: 0, radius: 10, fillColor: '#0066cc' },
        ];
      }
      const children: ContentItem[] = [];
      for (let i = 0; i < width; i++) {
        children.push({
          type: 'group',
          direction: i % 2 === 0 ? 'row' : 'column',
          padding: 5,
          gap: 5,
          border: { color: '#ccc', width: 1 },
          children: generateNestedGroups(depth - 1, width),
        });
      }
      return children;
    };

    const content: ContentItem[] = [
      {
        type: 'group',
        direction: 'column',
        gap: 10,
        children: generateNestedGroups(3, 4), // 4^3 = 64 leaf group blocks
      },
    ];

    const input: Input = {
      filename: 'benchmark-doc.pdf',
      content,
    };

    // Warmup
    await tool.handler(input, extra);

    const iterations = 50;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await tool.handler(input, extra);
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;

    console.log('\n========================================');
    console.log(`BENCHMARK RESULTS (${iterations} iterations):`);
    console.log(`Total time: ${elapsed.toFixed(2)} ms`);
    console.log(`Average time per PDF layout render: ${avgMs.toFixed(3)} ms`);
    console.log('========================================\n');

    assert.ok(avgMs > 0);
  });
});
