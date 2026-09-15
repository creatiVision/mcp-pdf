import assert from 'assert';
import { type StyledSegment, type Token, tokenizeMarkdown, tokensToStyledSegments } from '../../../src/lib/markdown.ts';

describe('markdown utilities', () => {
  describe('tokenizeMarkdown', () => {
    it('returns empty array for empty string', () => {
      const tokens = tokenizeMarkdown('');
      assert.deepStrictEqual(tokens, []);
    });

    it('tokenizes plain text', () => {
      const tokens = tokenizeMarkdown('Hello world');
      assert.deepStrictEqual(tokens, [{ type: 'text', text: 'Hello world' }]);
    });

    it('tokenizes bold text using asterisks (**bold**)', () => {
      const tokens = tokenizeMarkdown('**bold text**');
      assert.deepStrictEqual(tokens, [{ type: 'bold', text: 'bold text' }]);
    });

    it('tokenizes bold text using underscores (__bold__)', () => {
      const tokens = tokenizeMarkdown('__bold text__');
      assert.deepStrictEqual(tokens, [{ type: 'bold', text: 'bold text' }]);
    });

    it('tokenizes italic text using asterisks (*italic*)', () => {
      const tokens = tokenizeMarkdown('*italic text*');
      assert.deepStrictEqual(tokens, [{ type: 'italic', text: 'italic text' }]);
    });

    it('tokenizes italic text using underscores (_italic_)', () => {
      const tokens = tokenizeMarkdown('_italic text_');
      assert.deepStrictEqual(tokens, [{ type: 'italic', text: 'italic text' }]);
    });

    it('tokenizes bold+italic text (***boldItalic***)', () => {
      const tokens = tokenizeMarkdown('***bold and italic***');
      assert.deepStrictEqual(tokens, [{ type: 'boldItalic', text: 'bold and italic' }]);
    });

    it('tokenizes bold+italic text (___boldItalic___)', () => {
      const tokens = tokenizeMarkdown('___bold and italic___');
      assert.deepStrictEqual(tokens, [{ type: 'boldItalic', text: 'bold and italic' }]);
    });

    it('tokenizes markdown links ([text](url))', () => {
      const tokens = tokenizeMarkdown('[Example](https://example.com)');
      assert.deepStrictEqual(tokens, [{ type: 'link', text: 'Example', url: 'https://example.com' }]);
    });

    it('tokenizes mixed text with plain text and styled segments', () => {
      const input = 'This is **bold**, *italic*, ***boldItalic***, and a [link](https://example.com).';
      const tokens = tokenizeMarkdown(input);
      assert.deepStrictEqual(tokens, [
        { type: 'text', text: 'This is ' },
        { type: 'bold', text: 'bold' },
        { type: 'text', text: ', ' },
        { type: 'italic', text: 'italic' },
        { type: 'text', text: ', ' },
        { type: 'boldItalic', text: 'boldItalic' },
        { type: 'text', text: ', and a ' },
        { type: 'link', text: 'link', url: 'https://example.com' },
        { type: 'text', text: '.' },
      ]);
    });
  });

  describe('tokensToStyledSegments', () => {
    it('converts text token to StyledSegment', () => {
      const tokens: Token[] = [{ type: 'text', text: 'Hello' }];
      const segments: StyledSegment[] = tokensToStyledSegments(tokens);
      assert.deepStrictEqual(segments, [
        {
          type: 'text',
          content: 'Hello',
          bold: false,
          italic: false,
          url: undefined,
        },
      ]);
    });

    it('converts bold token to StyledSegment', () => {
      const tokens: Token[] = [{ type: 'bold', text: 'Bold text' }];
      const segments: StyledSegment[] = tokensToStyledSegments(tokens);
      assert.deepStrictEqual(segments, [
        {
          type: 'text',
          content: 'Bold text',
          bold: true,
          italic: false,
          url: undefined,
        },
      ]);
    });

    it('converts italic token to StyledSegment', () => {
      const tokens: Token[] = [{ type: 'italic', text: 'Italic text' }];
      const segments: StyledSegment[] = tokensToStyledSegments(tokens);
      assert.deepStrictEqual(segments, [
        {
          type: 'text',
          content: 'Italic text',
          bold: false,
          italic: true,
          url: undefined,
        },
      ]);
    });

    it('converts boldItalic token to StyledSegment', () => {
      const tokens: Token[] = [{ type: 'boldItalic', text: 'Bold Italic text' }];
      const segments: StyledSegment[] = tokensToStyledSegments(tokens);
      assert.deepStrictEqual(segments, [
        {
          type: 'text',
          content: 'Bold Italic text',
          bold: true,
          italic: true,
          url: undefined,
        },
      ]);
    });

    it('converts link token to StyledSegment', () => {
      const tokens: Token[] = [{ type: 'link', text: 'Link text', url: 'https://example.com' }];
      const segments: StyledSegment[] = tokensToStyledSegments(tokens);
      assert.deepStrictEqual(segments, [
        {
          type: 'link',
          content: 'Link text',
          bold: false,
          italic: false,
          url: 'https://example.com',
        },
      ]);
    });

    it('converts multiple tokens to styled segments correctly', () => {
      const tokens: Token[] = [
        { type: 'text', text: 'Normal ' },
        { type: 'bold', text: 'Bold' },
        { type: 'text', text: ' and ' },
        { type: 'link', text: 'Link', url: 'https://example.com' },
      ];
      const segments: StyledSegment[] = tokensToStyledSegments(tokens);
      assert.deepStrictEqual(segments, [
        { type: 'text', content: 'Normal ', bold: false, italic: false, url: undefined },
        { type: 'text', content: 'Bold', bold: true, italic: false, url: undefined },
        { type: 'text', content: ' and ', bold: false, italic: false, url: undefined },
        { type: 'link', content: 'Link', bold: false, italic: false, url: 'https://example.com' },
      ]);
    });
  });
});
