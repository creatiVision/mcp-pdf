import assert from 'assert';
import path from 'path';
import { clearImageDimensionsCache, resolveImageDimensions } from '../../../src/lib/image-dimensions.ts';

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

describe('image-dimensions utilities with caching', () => {
  const imagePath = path.resolve(process.cwd(), 'resources/logo.png');

  beforeEach(() => {
    clearImageDimensionsCache();
  });

  it('resolves image dimensions and uses cache on subsequent calls', () => {
    const dims1 = resolveImageDimensions(imagePath);
    assert.ok(dims1.width > 0, 'Width should be positive');
    assert.ok(dims1.height > 0, 'Height should be positive');

    const dims2 = resolveImageDimensions(imagePath);
    assert.deepStrictEqual(dims1, dims2, 'Cached result should equal uncached result');
  });

  it('calculates aspect ratios correctly with partial explicit dimensions', () => {
    const intrinsic = resolveImageDimensions(imagePath);

    const dimsWidthOnly = resolveImageDimensions(imagePath, 100, undefined);
    assert.strictEqual(dimsWidthOnly.width, 100);
    assert.strictEqual(dimsWidthOnly.height, 100 * (intrinsic.height / intrinsic.width));

    const dimsHeightOnly = resolveImageDimensions(imagePath, undefined, 200);
    assert.strictEqual(dimsHeightOnly.height, 200);
    assert.strictEqual(dimsHeightOnly.width, 200 * (intrinsic.width / intrinsic.height));
  });

  it('bypasses file lookups when both explicit width and height are provided', () => {
    const dims = resolveImageDimensions('non-existent-image.png', 300, 150);
    assert.strictEqual(dims.width, 300);
    assert.strictEqual(dims.height, 150);
  });

  it('handles non-existent local image files by caching null result', () => {
    const nonExistent = path.resolve(process.cwd(), 'non-existent-image-path.png');

    assert.throws(() => {
      resolveImageDimensions(nonExistent);
    }, /Cannot determine image dimensions/);

    assert.throws(() => {
      resolveImageDimensions(nonExistent);
    }, /Cannot determine image dimensions/);
  });

  it('clears cache when clearImageDimensionsCache is called', () => {
    const dims1 = resolveImageDimensions(imagePath);
    clearImageDimensionsCache();
    const dims2 = resolveImageDimensions(imagePath);
    assert.deepStrictEqual(dims1, dims2);
  });
});
