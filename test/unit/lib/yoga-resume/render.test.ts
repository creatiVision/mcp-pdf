import assert from 'assert';
import PDFDocument from 'pdfkit';
import type { FieldTemplates } from '../../../../src/lib/ir/types.ts';
import { DEFAULT_TYPOGRAPHY } from '../../../../src/lib/types/typography.ts';
import { createRenderContext } from '../../../../src/lib/yoga-resume/render.ts';

describe('yoga-resume/render', () => {
  const fieldTemplates: Required<FieldTemplates> = {
    location: '{location}',
    dateRange: '{startDate} - {endDate}',
    companyHeader: '{company}',
    credentialHeader: '{name}',
  };

  describe('createRenderContext', () => {
    it('creates a valid render context with all required properties', () => {
      const doc = new PDFDocument();
      const options = {
        doc,
        typography: DEFAULT_TYPOGRAPHY,
        fieldTemplates,
        emojiAvailable: true,
        parseMarkdown: true,
        hyperlinkColor: '#123456',
      };

      const ctx = createRenderContext(options);

      assert.strictEqual(ctx.doc, doc);
      assert.strictEqual(ctx.typography, DEFAULT_TYPOGRAPHY);
      assert.strictEqual(ctx.fieldTemplates, fieldTemplates);
      assert.strictEqual(ctx.emojiAvailable, true);
      assert.strictEqual(ctx.fonts, DEFAULT_TYPOGRAPHY.fonts);
      assert.strictEqual(ctx.parseMarkdown, true);
      assert.strictEqual(ctx.hyperlinkColor, '#123456');
    });
  });
});
