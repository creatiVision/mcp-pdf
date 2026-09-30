import assert from 'assert';
import { paragraphsFromContent } from '../../../src/lib/formatting.ts';

describe('formatting', () => {
  describe('paragraphsFromContent', () => {
    it('returns an empty array for undefined, empty string, or empty array', () => {
      assert.deepStrictEqual(paragraphsFromContent(undefined), []);
      assert.deepStrictEqual(paragraphsFromContent(''), []);
      assert.deepStrictEqual(paragraphsFromContent([]), []);
    });

    it('splits string content by double or multiple newlines and trims/filters whitespace', () => {
      const input = 'First paragraph.\n\nSecond paragraph.\n\n\nThird paragraph.  \n\n  ';
      assert.deepStrictEqual(paragraphsFromContent(input), ['First paragraph.', 'Second paragraph.', 'Third paragraph.']);
    });

    it('filters out falsy or empty entries when given an array of strings', () => {
      const input = ['Paragraph 1', '', 'Paragraph 2', '   ', 'Paragraph 3'];
      // Array mode filters by Boolean (empty strings removed)
      assert.deepStrictEqual(paragraphsFromContent(input), ['Paragraph 1', 'Paragraph 2', '   ', 'Paragraph 3']);
    });
  });
});
