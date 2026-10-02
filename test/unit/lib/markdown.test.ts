import assert from 'assert';
import { type Token, tokenizeMarkdown, tokensToStyledSegments } from '../../../src/lib/markdown.ts';

describe('tokenizeMarkdown', (): void => {
  it('returns empty array for empty string', (): void => {
    const result = tokenizeMarkdown('');
    assert.deepStrictEqual(result, []);
  });

  it('tokenizes plain text', (): void => {
    const result = tokenizeMarkdown('Hello World');
    assert.deepStrictEqual(result, [{ type: 'text', text: 'Hello World' }]);
  });

  it('tokenizes bold text using **', (): void => {
    const result = tokenizeMarkdown('**bold text**');
    assert.deepStrictEqual(result, [{ type: 'bold', text: 'bold text' }]);
  });

  it('tokenizes bold text using __', (): void => {
    const result = tokenizeMarkdown('__bold text__');
    assert.deepStrictEqual(result, [{ type: 'bold', text: 'bold text' }]);
  });

  it('tokenizes italic text using *', (): void => {
    const result = tokenizeMarkdown('*italic text*');
    assert.deepStrictEqual(result, [{ type: 'italic', text: 'italic text' }]);
  });

  it('tokenizes italic text using _', (): void => {
    const result = tokenizeMarkdown('_italic text_');
    assert.deepStrictEqual(result, [{ type: 'italic', text: 'italic text' }]);
  });

  it('tokenizes bold+italic text using ***', (): void => {
    const result = tokenizeMarkdown('***bold and italic***');
    assert.deepStrictEqual(result, [{ type: 'boldItalic', text: 'bold and italic' }]);
  });

  it('tokenizes bold+italic text using ___', (): void => {
    const result = tokenizeMarkdown('___bold and italic___');
    assert.deepStrictEqual(result, [{ type: 'boldItalic', text: 'bold and italic' }]);
  });

  it('tokenizes links', (): void => {
    const result = tokenizeMarkdown('[Example](https://example.com)');
    assert.deepStrictEqual(result, [{ type: 'link', text: 'Example', url: 'https://example.com' }]);
  });

  it('tokenizes mixed markdown with text, bold, italic, and links', (): void => {
    const result = tokenizeMarkdown('Normal **bold** and *italic* plus [a link](https://example.com)');
    assert.deepStrictEqual(result, [
      { type: 'text', text: 'Normal ' },
      { type: 'bold', text: 'bold' },
      { type: 'text', text: ' and ' },
      { type: 'italic', text: 'italic' },
      { type: 'text', text: ' plus ' },
      { type: 'link', text: 'a link', url: 'https://example.com' },
    ]);
  });

  it('handles link with nested styling', (): void => {
    const result = tokenizeMarkdown('[**Bold Link**](https://example.com)');
    assert.deepStrictEqual(result, [{ type: 'link', text: 'Bold Link', url: 'https://example.com' }]);
  });

  it('handles escaped markdown characters', (): void => {
    const result = tokenizeMarkdown('\\*not italic\\* and \\*\\*not bold\\*\\*');
    assert.deepStrictEqual(result, [{ type: 'text', text: '*not italic* and **not bold**' }]);
  });

  it('handles complex link structures with query params and anchors', (): void => {
    const result = tokenizeMarkdown('[Search Page](https://example.com/search?q=mcp&sort=desc#results)');
    assert.deepStrictEqual(result, [{ type: 'link', text: 'Search Page', url: 'https://example.com/search?q=mcp&sort=desc#results' }]);
  });

  it('handles link with nested emphasis', (): void => {
    const result = tokenizeMarkdown('[*Italic Link*](https://example.com)');
    assert.deepStrictEqual(result, [{ type: 'link', text: 'Italic Link', url: 'https://example.com' }]);
  });

  it('handles multiline inputs and line breaks', (): void => {
    const result = tokenizeMarkdown('Line 1\nLine 2\n\nParagraph 2 with **bold**');
    assert.deepStrictEqual(result, [
      { type: 'text', text: 'Line 1\nLine 2' },
      { type: 'text', text: 'Paragraph 2 with ' },
      { type: 'bold', text: 'bold' },
    ]);
  });

  it('handles unicode and emoji characters in tokens', (): void => {
    const result = tokenizeMarkdown('Hello 🚀 **Bold 🌟** and [Emoji Link 🔗](https://emoji.org)');
    assert.deepStrictEqual(result, [
      { type: 'text', text: 'Hello 🚀 ' },
      { type: 'bold', text: 'Bold 🌟' },
      { type: 'text', text: ' and ' },
      { type: 'link', text: 'Emoji Link 🔗', url: 'https://emoji.org' },
    ]);
  });

  it('handles adjacent styled tokens and links', (): void => {
    const result = tokenizeMarkdown('**Bold**_Italic_[Link](https://example.com)');
    assert.deepStrictEqual(result, [
      { type: 'bold', text: 'Bold' },
      { type: 'italic', text: 'Italic' },
      { type: 'link', text: 'Link', url: 'https://example.com' },
    ]);
  });
});

describe('tokensToStyledSegments', (): void => {
  it('returns empty array for empty tokens input', (): void => {
    const result = tokensToStyledSegments([]);
    assert.deepStrictEqual(result, []);
  });

  it('converts plain text tokens to styled segments', (): void => {
    const tokens: Token[] = [{ type: 'text', text: 'Hello' }];
    const result = tokensToStyledSegments(tokens);
    assert.deepStrictEqual(result, [{ type: 'text', content: 'Hello', bold: false, italic: false, url: undefined }]);
  });

  it('converts bold tokens to styled segments', (): void => {
    const tokens: Token[] = [{ type: 'bold', text: 'Bold Text' }];
    const result = tokensToStyledSegments(tokens);
    assert.deepStrictEqual(result, [{ type: 'text', content: 'Bold Text', bold: true, italic: false, url: undefined }]);
  });

  it('converts italic tokens to styled segments', (): void => {
    const tokens: Token[] = [{ type: 'italic', text: 'Italic Text' }];
    assert.deepStrictEqual(tokensToStyledSegments(tokens), [{ type: 'text', content: 'Italic Text', bold: false, italic: true, url: undefined }]);
  });

  it('converts boldItalic tokens to styled segments', (): void => {
    const tokens: Token[] = [{ type: 'boldItalic', text: 'Bold Italic Text' }];
    assert.deepStrictEqual(tokensToStyledSegments(tokens), [{ type: 'text', content: 'Bold Italic Text', bold: true, italic: true, url: undefined }]);
  });

  it('converts link tokens to styled segments', (): void => {
    const tokens: Token[] = [{ type: 'link', text: 'Link Text', url: 'https://example.com' }];
    assert.deepStrictEqual(tokensToStyledSegments(tokens), [{ type: 'link', content: 'Link Text', bold: false, italic: false, url: 'https://example.com' }]);
  });

  it('converts mixed tokens array correctly', (): void => {
    const tokens: Token[] = [
      { type: 'text', text: 'Text ' },
      { type: 'bold', text: 'Bold' },
      { type: 'text', text: ' ' },
      { type: 'italic', text: 'Italic' },
      { type: 'text', text: ' ' },
      { type: 'boldItalic', text: 'BoldItalic' },
      { type: 'text', text: ' ' },
      { type: 'link', text: 'Link', url: 'https://example.com' },
    ];
    assert.deepStrictEqual(tokensToStyledSegments(tokens), [
      { type: 'text', content: 'Text ', bold: false, italic: false, url: undefined },
      { type: 'text', content: 'Bold', bold: true, italic: false, url: undefined },
      { type: 'text', content: ' ', bold: false, italic: false, url: undefined },
      { type: 'text', content: 'Italic', bold: false, italic: true, url: undefined },
      { type: 'text', content: ' ', bold: false, italic: false, url: undefined },
      { type: 'text', content: 'BoldItalic', bold: true, italic: true, url: undefined },
      { type: 'text', content: ' ', bold: false, italic: false, url: undefined },
      { type: 'link', content: 'Link', bold: false, italic: false, url: 'https://example.com' },
    ]);
  });
});
