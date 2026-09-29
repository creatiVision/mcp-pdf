import assert from 'node:assert';
import { paragraphsFromContent } from '../../../src/lib/formatting.ts';

describe('formatting - paragraphsFromContent', () => {
  it('returns empty array when content is undefined or empty', () => {
    assert.deepStrictEqual(paragraphsFromContent(undefined), []);
    assert.deepStrictEqual(paragraphsFromContent(''), []);
  });

  it('filters out empty values when content is an array', () => {
    assert.deepStrictEqual(paragraphsFromContent(['Para 1', '', 'Para 2']), ['Para 1', 'Para 2']);
  });

  it('splits single string on double newlines and trims paragraphs', () => {
    const input = 'Paragraph 1\n\n  Paragraph 2  \n\n\nParagraph 3';
    assert.deepStrictEqual(paragraphsFromContent(input), ['Paragraph 1', 'Paragraph 2', 'Paragraph 3']);
  });
});
