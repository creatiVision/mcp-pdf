import assert from 'assert';
import * as path from 'path';
import { resolveImageDimensions } from '../../../src/lib/image-dimensions.ts';

describe('resolveImageDimensions security tests', () => {
  it('resolves dimensions for valid local image in working directory', () => {
    const validImagePath = 'assets/icon.png';
    const dims = resolveImageDimensions(validImagePath, 100, 100);
    assert.deepStrictEqual(dims, { width: 100, height: 100 });
  });

  it('blocks path traversal attempts with relative parent paths', () => {
    assert.throws(() => {
      resolveImageDimensions('../../etc/passwd');
    }, /Cannot determine image dimensions for/);
  });

  it('blocks path traversal attempts with absolute paths outside cwd', () => {
    assert.throws(() => {
      resolveImageDimensions('/etc/passwd');
    }, /Cannot determine image dimensions for/);
  });

  it('allows explicit width and height even if image path is outside cwd', () => {
    const dims = resolveImageDimensions('/etc/passwd', 200, 300);
    assert.deepStrictEqual(dims, { width: 200, height: 300 });
  });
});

describe('resolveImageDimensions', () => {
  describe('network images error handling', () => {
    it('throws error when no explicit dimensions provided for http URL', () => {
      const url = 'http://example.com/image.png';
      assert.throws(
        () => resolveImageDimensions(url),
        (err: Error) => {
          assert.strictEqual(err.message, `Image dimensions required for network images. Please provide explicit width and height for: ${url}`);
          return true;
        }
      );
    });

    it('throws error when no explicit dimensions provided for https URL', () => {
      const url = 'https://example.com/image.png';
      assert.throws(
        () => resolveImageDimensions(url),
        (err: Error) => {
          assert.strictEqual(err.message, `Image dimensions required for network images. Please provide explicit width and height for: ${url}`);
          return true;
        }
      );
    });

    it('throws error when only explicit width is provided for network URL', () => {
      const url = 'https://example.com/image.png';
      assert.throws(
        () => resolveImageDimensions(url, 100, undefined),
        (err: Error) => {
          assert.strictEqual(err.message, `Image dimensions required for network images. Please provide explicit width and height for: ${url}`);
          return true;
        }
      );
    });

    it('throws error when only explicit height is provided for network URL', () => {
      const url = 'https://example.com/image.png';
      assert.throws(
        () => resolveImageDimensions(url, undefined, 200),
        (err: Error) => {
          assert.strictEqual(err.message, `Image dimensions required for network images. Please provide explicit width and height for: ${url}`);
          return true;
        }
      );
    });

    it('returns provided dimensions when both explicit width and height are provided for network URL', () => {
      const url = 'https://example.com/image.png';
      const result = resolveImageDimensions(url, 100, 200);
      assert.deepStrictEqual(result, { width: 100, height: 200 });
    });
  });

  describe('local images error handling', () => {
    it('throws error when local image does not exist and no dimensions provided', () => {
      const imagePath = 'non-existent-image.png';
      assert.throws(
        () => resolveImageDimensions(imagePath),
        (err: Error) => {
          assert.strictEqual(err.message, `Cannot determine image dimensions for: ${imagePath}. File may not exist or format is unsupported. Please provide explicit width and height.`);
          return true;
        }
      );
    });
  });
});
