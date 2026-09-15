import { createCanvas } from '@napi-rs/canvas';
import assert from 'assert';
import { measureEmoji, renderEmojiToBuffer, splitTextAndEmoji } from '../../../src/lib/emoji-renderer.ts';

describe('splitTextAndEmoji', (): void => {
  it('returns single text segment for ASCII-only text', (): void => {
    const result = splitTextAndEmoji('Hello World');
    assert.deepStrictEqual(result, [{ type: 'text', content: 'Hello World' }]);
  });

  it('returns empty array for empty string', (): void => {
    const result = splitTextAndEmoji('');
    assert.deepStrictEqual(result, []);
  });

  it('does NOT split on Greek letters (they render fine)', (): void => {
    const result = splitTextAndEmoji('Ξ Greek letter');
    assert.deepStrictEqual(result, [{ type: 'text', content: 'Ξ Greek letter' }]);
  });

  it('does NOT split on geometric shapes (they render fine)', (): void => {
    const result = splitTextAndEmoji('△ ○ ◆ shapes');
    assert.deepStrictEqual(result, [{ type: 'text', content: '△ ○ ◆ shapes' }]);
  });

  it('splits on miscellaneous symbols that are emoji per Unicode Standard', (): void => {
    // Note: ☑, ⚠ are emoji per Unicode Standard and emoji-regex correctly identifies them
    // This gives us color versions instead of black & white!
    const result = splitTextAndEmoji('☐ ☑ ⚠ ★ symbols');
    // ☑ and ⚠ are emoji, ☐ and ★ are not (per Unicode emoji list)
    assert.ok(
      result.some((seg) => seg.type === 'emoji'),
      'Should detect emoji in symbols'
    );
  });

  it('splits on dingbats that are emoji per Unicode Standard', (): void => {
    // Note: ✂ is an emoji per Unicode Standard and emoji-regex correctly identifies it
    const result = splitTextAndEmoji('✂ ✓ ✗ ➤ dingbats');
    // ✂ is an emoji (per Unicode emoji list)
    assert.ok(
      result.some((seg) => seg.type === 'emoji'),
      'Should detect emoji in dingbats'
    );
  });

  it('splits true emoji from text', (): void => {
    const result = splitTextAndEmoji('Hello 👋 World');
    assert.deepStrictEqual(result, [
      { type: 'text', content: 'Hello ' },
      { type: 'emoji', content: '👋' },
      { type: 'text', content: ' World' },
    ]);
  });

  it('handles emoji at start', (): void => {
    const result = splitTextAndEmoji('😀 Hello');
    assert.deepStrictEqual(result, [
      { type: 'emoji', content: '😀' },
      { type: 'text', content: ' Hello' },
    ]);
  });

  it('handles emoji at end', (): void => {
    const result = splitTextAndEmoji('Hello 🎉');
    assert.deepStrictEqual(result, [
      { type: 'text', content: 'Hello ' },
      { type: 'emoji', content: '🎉' },
    ]);
  });

  it('handles only emoji', (): void => {
    const result = splitTextAndEmoji('😀🎉👋');
    assert.deepStrictEqual(result, [
      { type: 'emoji', content: '😀' },
      { type: 'emoji', content: '🎉' },
      { type: 'emoji', content: '👋' },
    ]);
  });

  it('handles multiple emoji with text between', (): void => {
    const result = splitTextAndEmoji('Hello 👋 how are you 😀 today');
    assert.deepStrictEqual(result, [
      { type: 'text', content: 'Hello ' },
      { type: 'emoji', content: '👋' },
      { type: 'text', content: ' how are you ' },
      { type: 'emoji', content: '😀' },
      { type: 'text', content: ' today' },
    ]);
  });

  it('handles extended emoji (U+1FA00-U+1FAFF)', (): void => {
    const result = splitTextAndEmoji('Hello 🪀 yoyo');
    assert.deepStrictEqual(result, [
      { type: 'text', content: 'Hello ' },
      { type: 'emoji', content: '🪀' },
      { type: 'text', content: ' yoyo' },
    ]);
  });

  it('correctly handles mixed standard symbols and emoji', (): void => {
    // Standard symbols that are NOT emoji (Ξ △ ○) vs true emoji (😀)
    // Note: ☐ might be split by emoji-regex if it's on the emoji list
    const result = splitTextAndEmoji('Ξ △ ○ 😀 test');
    // Should have at least one emoji segment for 😀
    assert.ok(
      result.some((seg) => seg.type === 'emoji' && seg.content === '😀'),
      'Should detect true emoji'
    );
    // Greek letters and geometric shapes should remain as text
    assert.ok(
      result.some((seg) => seg.type === 'text' && seg.content.includes('Ξ')),
      'Should keep Greek letters as text'
    );
  });

  it('real-world example: resume with symbols', (): void => {
    const result = splitTextAndEmoji('• Ξ Platform Growth: Scaled system—achieved 40+ success');
    assert.deepStrictEqual(result, [{ type: 'text', content: '• Ξ Platform Growth: Scaled system—achieved 40+ success' }], 'Should treat bullets, Greek letters, and dashes as regular text');
  });

  it('real-world example: resume with true emoji', (): void => {
    const result = splitTextAndEmoji('🚀 Platform Growth: Scaled system successfully');
    assert.deepStrictEqual(result, [
      { type: 'emoji', content: '🚀' },
      { type: 'text', content: ' Platform Growth: Scaled system successfully' },
    ]);
  });

  it('handles complex emoji sequences (skin tones, ZWJ sequences)', (): void => {
    // Note: Skin tone modifiers and ZWJ sequences are complex, but our regex
    // should at least capture the base emoji
    const result = splitTextAndEmoji('Hello 👋🏼 World');

    // The result may vary depending on how the regex handles modifiers
    // At minimum, we should have an emoji segment
    assert.ok(
      result.some((seg) => seg.type === 'emoji'),
      'Should detect emoji in sequence'
    );
  });
});

describe('renderEmojiToBuffer', (): void => {
  it('renders emoji to buffer successfully', (): void => {
    const buffer = renderEmojiToBuffer('😀', 24);
    assert.ok(Buffer.isBuffer(buffer), 'Should return a Buffer');
    assert.ok(buffer.length > 0, 'Buffer should not be empty');
  });

  it('returns null when canvas rendering / toBuffer fails with exception', (): void => {
    const sampleCanvas = createCanvas(1, 1);
    const canvasProto = Object.getPrototypeOf(sampleCanvas);
    const originalToBuffer = canvasProto.toBuffer;
    try {
      canvasProto.toBuffer = () => {
        throw new Error('Canvas buffer rendering failed');
      };

      const result = renderEmojiToBuffer('😀', 24);
      assert.strictEqual(result, null, 'Should return null when toBuffer throws exception');
    } finally {
      canvasProto.toBuffer = originalToBuffer;
    }
  });

  it('returns null when context methods throw an exception during rendering', (): void => {
    const sampleCanvas = createCanvas(1, 1);
    const canvasProto = Object.getPrototypeOf(sampleCanvas);
    const originalGetContext = canvasProto.getContext;
    try {
      canvasProto.getContext = () => {
        throw new Error('Failed to get context');
      };

      const result = renderEmojiToBuffer('😀', 24);
      assert.strictEqual(result, null, 'Should return null when getContext throws exception');
    } finally {
      canvasProto.getContext = originalGetContext;
    }
  });
});

describe('measureEmoji error handling', (): void => {
  it('returns fallback square metrics when measureEmoji encounters canvas exception', (): void => {
    const sampleCanvas = createCanvas(1, 1);
    const canvasProto = Object.getPrototypeOf(sampleCanvas);
    const originalGetContext = canvasProto.getContext;
    try {
      canvasProto.getContext = () => {
        throw new Error('Canvas context error during measurement');
      };

      const metrics = measureEmoji('😀', 24);
      assert.deepStrictEqual(metrics, { width: 24, height: 24, baselineOffset: 0 }, 'Should return default fallback metrics when measurement fails');
    } finally {
      canvasProto.getContext = originalGetContext;
    }
  });
});
