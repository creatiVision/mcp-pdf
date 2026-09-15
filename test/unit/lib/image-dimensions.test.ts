import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { clearImageDimensionsCache, resolveImageDimensions, resolveImageDimensionsAsync } from '../../../src/lib/image-dimensions.ts';

describe('resolveImageDimensions', () => {
  beforeEach(() => {
    clearImageDimensionsCache();
  });

  describe('network images error handling', () => {
    it('throws error when no explicit dimensions provided for http URL', async () => {
      const url = 'http://example.com/image.png';
      assert.throws(
        () => resolveImageDimensions(url),
        (err: Error) => {
          assert.strictEqual(err.message, `Image dimensions required for network images. Please provide explicit width and height for: ${url}`);
          return true;
        }
      );

      await assert.rejects(
        async () => await resolveImageDimensionsAsync(url),
        (err: Error) => {
          assert.strictEqual(err.message, `Image dimensions required for network images. Please provide explicit width and height for: ${url}`);
          return true;
        }
      );
    });

    it('throws error when no explicit dimensions provided for https URL', async () => {
      const url = 'https://example.com/image.png';
      assert.throws(
        () => resolveImageDimensions(url),
        (err: Error) => {
          assert.strictEqual(err.message, `Image dimensions required for network images. Please provide explicit width and height for: ${url}`);
          return true;
        }
      );

      await assert.rejects(
        async () => await resolveImageDimensionsAsync(url),
        (err: Error) => {
          assert.strictEqual(err.message, `Image dimensions required for network images. Please provide explicit width and height for: ${url}`);
          return true;
        }
      );
    });

    it('throws error when only explicit width is provided for network URL', async () => {
      const url = 'https://example.com/image.png';
      assert.throws(
        () => resolveImageDimensions(url, 100, undefined),
        (err: Error) => {
          assert.strictEqual(err.message, `Image dimensions required for network images. Please provide explicit width and height for: ${url}`);
          return true;
        }
      );

      await assert.rejects(
        async () => await resolveImageDimensionsAsync(url, 100, undefined),
        (err: Error) => {
          assert.strictEqual(err.message, `Image dimensions required for network images. Please provide explicit width and height for: ${url}`);
          return true;
        }
      );
    });

    it('throws error when only explicit height is provided for network URL', async () => {
      const url = 'https://example.com/image.png';
      assert.throws(
        () => resolveImageDimensions(url, undefined, 200),
        (err: Error) => {
          assert.strictEqual(err.message, `Image dimensions required for network images. Please provide explicit width and height for: ${url}`);
          return true;
        }
      );

      await assert.rejects(
        async () => await resolveImageDimensionsAsync(url, undefined, 200),
        (err: Error) => {
          assert.strictEqual(err.message, `Image dimensions required for network images. Please provide explicit width and height for: ${url}`);
          return true;
        }
      );
    });

    it('returns provided dimensions when both explicit width and height are provided for network URL', async () => {
      const url = 'https://example.com/image.png';
      const resultSync = resolveImageDimensions(url, 100, 200);
      assert.deepStrictEqual(resultSync, { width: 100, height: 200 });

      const resultAsync = await resolveImageDimensionsAsync(url, 100, 200);
      assert.deepStrictEqual(resultAsync, { width: 100, height: 200 });
    });
  });

  describe('local images error handling and caching', () => {
    it('throws error when local image does not exist and no dimensions provided', async () => {
      const imagePath = 'non-existent-image.png';
      assert.throws(
        () => resolveImageDimensions(imagePath),
        (err: Error) => {
          assert.strictEqual(err.message, `Cannot determine image dimensions for: ${imagePath}. File may not exist or format is unsupported. Please provide explicit width and height.`);
          return true;
        }
      );

      await assert.rejects(
        async () => await resolveImageDimensionsAsync(imagePath),
        (err: Error) => {
          assert.strictEqual(err.message, `Cannot determine image dimensions for: ${imagePath}. File may not exist or format is unsupported. Please provide explicit width and height.`);
          return true;
        }
      );
    });

    it('reads intrinsic dimensions and uses cache for local image file', async () => {
      const tmpDir = path.resolve(process.cwd(), '.tmp', 'test-images');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      const testImgPath = path.join(tmpDir, 'sample_10x10.png');
      const pngHeaderHex = '89504e470d0a1a0a0000000d494844520000000a0000000a08060000008d32cfbd0000000d49444154789c6360000000020001e527defc0000000049454e44ae426082';
      fs.writeFileSync(testImgPath, Buffer.from(pngHeaderHex, 'hex'));

      try {
        const dimsAsync = await resolveImageDimensionsAsync(testImgPath);
        assert.deepStrictEqual(dimsAsync, { width: 10, height: 10 });

        const dimsSync = resolveImageDimensions(testImgPath);
        assert.deepStrictEqual(dimsSync, { width: 10, height: 10 });
      } finally {
        if (fs.existsSync(testImgPath)) {
          fs.unlinkSync(testImgPath);
        }
      }
    });
  });
});
