import assert from 'assert';
import PDFDocument from 'pdfkit';
import type { FieldTemplates, GroupElement, HeaderElement, LayoutElement, TextElement } from '../../../../src/lib/ir/types.ts';
import { DEFAULT_TYPOGRAPHY } from '../../../../src/lib/types/typography.ts';
import { calculateResumeLayout, calculateTwoColumnLayout, transformToYogaNodes } from '../../../../src/lib/yoga-resume/ir-to-yoga.ts';

describe('yoga-resume/ir-to-yoga', () => {
  const fieldTemplates: Required<FieldTemplates> = {
    location: '{location}',
    dateRange: '{dateRange}',
    degree: '{degree}',
    contactLine: '{contactLine}',
    credential: '{credential}',
    language: '{language}',
    skill: '{skill}',
    url: '{url}',
  };

  function createTestDoc(): PDFKit.PDFDocument {
    return new PDFDocument({
      size: [612, 792],
      margins: { top: 50, bottom: 50, left: 54, right: 54 },
      autoFirstPage: false,
    });
  }

  describe('transformToYogaNodes', () => {
    it('transforms simple non-group IR elements to Yoga nodes', () => {
      const elements: LayoutElement[] = [
        { type: 'header', name: 'John Doe', contactItems: [{ text: 'john@example.com' }] } as HeaderElement,
        { type: 'text', content: 'Hello world' } as TextElement,
      ];

      const nodes = transformToYogaNodes(elements);

      assert.strictEqual(nodes.length, 2);
      assert.strictEqual(nodes[0].type, 'header');
      assert.strictEqual(nodes[0]._element, elements[0]);

      assert.strictEqual(nodes[1].type, 'text');
      assert.strictEqual(nodes[1]._element, elements[1]);
    });

    it('transforms group IR elements with wrap=true (_atomic=false)', () => {
      const group: GroupElement = {
        type: 'group',
        wrap: true,
        children: [
          { type: 'text', content: 'Child 1' } as TextElement,
          { type: 'text', content: 'Child 2' } as TextElement,
        ],
      };

      const nodes = transformToYogaNodes([group]);

      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].type, 'group');
      assert.strictEqual(nodes[0].direction, 'column');
      assert.strictEqual(nodes[0]._atomic, false);
      assert.strictEqual(nodes[0].children?.length, 2);
      assert.strictEqual(nodes[0].children?.[0]._element, group.children[0]);
      assert.strictEqual(nodes[0].children?.[1]._element, group.children[1]);
    });

    it('transforms group IR elements with wrap=false (_atomic=true)', () => {
      const group: GroupElement = {
        type: 'group',
        wrap: false,
        children: [{ type: 'text', content: 'Atomic item' } as TextElement],
      };

      const nodes = transformToYogaNodes([group]);

      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0]._atomic, true);
    });

    it('transforms nested group elements recursively', () => {
      const nestedGroup: GroupElement = {
        type: 'group',
        wrap: true,
        children: [
          {
            type: 'group',
            wrap: false,
            children: [{ type: 'text', content: 'Nested leaf' } as TextElement],
          } as GroupElement,
        ],
      };

      const nodes = transformToYogaNodes([nestedGroup]);

      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].children?.length, 1);
      assert.strictEqual(nodes[0].children?.[0].type, 'group');
      assert.strictEqual(nodes[0].children?.[0]._atomic, true);
      assert.strictEqual(nodes[0].children?.[0].children?.length, 1);
      assert.strictEqual(nodes[0].children?.[0].children?.[0].type, 'text');
    });
  });

  describe('calculateResumeLayout', () => {
    it('calculates layout for simple IR elements', async () => {
      const doc = createTestDoc();
      doc.addPage();

      const elements: LayoutElement[] = [
        { type: 'header', name: 'Jane Doe', contactItems: [{ text: 'jane@example.com' }] } as HeaderElement,
        { type: 'text', content: 'Summary paragraph' } as TextElement,
      ];

      const resultNodes = await calculateResumeLayout(doc, elements, DEFAULT_TYPOGRAPHY, fieldTemplates, false);

      assert.strictEqual(resultNodes.length, 2);

      // Verify node 0
      assert.strictEqual(resultNodes[0].element, elements[0]);
      assert.strictEqual(typeof resultNodes[0].x, 'number');
      assert.strictEqual(typeof resultNodes[0].y, 'number');
      assert.strictEqual(typeof resultNodes[0].width, 'number');
      assert.strictEqual(typeof resultNodes[0].height, 'number');
      assert.ok(resultNodes[0].width > 0);

      // Verify node 1 is positioned below node 0
      assert.strictEqual(resultNodes[1].element, elements[1]);
      assert.ok(resultNodes[1].y >= resultNodes[0].y + resultNodes[0].height);

      doc.end();
    });

    it('calculates layout for nested group IR elements', async () => {
      const doc = createTestDoc();
      doc.addPage();

      const child1: TextElement = { type: 'text', content: 'Child 1 text' };
      const child2: TextElement = { type: 'text', content: 'Child 2 text' };
      const group: GroupElement = {
        type: 'group',
        wrap: true,
        children: [child1, child2],
      };

      const resultNodes = await calculateResumeLayout(doc, [group], DEFAULT_TYPOGRAPHY, fieldTemplates, false);

      assert.strictEqual(resultNodes.length, 1);
      assert.strictEqual(resultNodes[0].element, group);
      assert.ok(Array.isArray(resultNodes[0].children));
      assert.strictEqual(resultNodes[0].children?.length, 2);
      assert.strictEqual(resultNodes[0].children?.[0].element, child1);
      assert.strictEqual(resultNodes[0].children?.[1].element, child2);

      doc.end();
    });
  });

  describe('calculateTwoColumnLayout', () => {
    it('calculates two-column layout with default widths (30% / 70%)', async () => {
      const doc = createTestDoc();
      doc.addPage();

      const leftElements: LayoutElement[] = [{ type: 'text', content: 'Left column text' } as TextElement];
      const rightElements: LayoutElement[] = [{ type: 'text', content: 'Right column text' } as TextElement];

      const config = {
        gap: 20,
        left: { elements: leftElements },
        right: { elements: rightElements },
      };

      const result = await calculateTwoColumnLayout(doc, config, DEFAULT_TYPOGRAPHY, fieldTemplates, false);

      assert.strictEqual(result.left.length, 1);
      assert.strictEqual(result.right.length, 1);

      assert.strictEqual(result.left[0].element, leftElements[0]);
      assert.strictEqual(result.right[0].element, rightElements[0]);

      // Check column positions
      assert.ok(typeof result.columnPositions.leftX === 'number');
      assert.ok(typeof result.columnPositions.rightX === 'number');
      assert.ok(result.columnPositions.rightX > result.columnPositions.leftX);
      assert.ok(result.columnPositions.leftWidth > 0);
      assert.ok(result.columnPositions.rightWidth > 0);

      doc.end();
    });

    it('calculates two-column layout with explicit widths', async () => {
      const doc = createTestDoc();
      doc.addPage();

      const leftElements: LayoutElement[] = [{ type: 'text', content: 'Sidebar' } as TextElement];
      const rightElements: LayoutElement[] = [{ type: 'text', content: 'Main content' } as TextElement];

      const config = {
        gap: 15,
        left: { width: '40%', elements: leftElements },
        right: { width: '60%', elements: rightElements },
      };

      const result = await calculateTwoColumnLayout(doc, config, DEFAULT_TYPOGRAPHY, fieldTemplates, false);

      assert.strictEqual(result.left.length, 1);
      assert.strictEqual(result.right.length, 1);
      assert.ok(result.columnPositions.leftWidth < result.columnPositions.rightWidth);

      doc.end();
    });
  });
});
