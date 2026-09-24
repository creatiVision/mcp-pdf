import { createCanvas } from '@napi-rs/canvas';
import assert from 'assert';
import fs, { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path, { join } from 'path';
import { clearImageDimensionsCache, resolveImageDimensions, resolveImageDimensionsAsync } from '../../../src/lib/image-dimensions.ts';

// Use .tmp/ in package root per QUALITY.md rule T8
const testOutputDir = join(process.cwd(), '.tmp', 'image-dimensions-tests');

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

  it('blocks path traversal attempts when a valid image exists outside cwd', async () => {
    const outOfBoundsPath = path.join(os.tmpdir(), 'out-of-bounds-test.png');
    const pngHeaderHex = '89504e470d0a1a0a0000000d494844520000000a0000000a08060000008d32cfbd0000000d49444154789c6360000000020001e527defc0000000049454e44ae426082';
    fs.writeFileSync(outOfBoundsPath, Buffer.from(pngHeaderHex, 'hex'));

    try {
      assert.throws(() => {
        resolveImageDimensions(outOfBoundsPath);
      }, /Cannot determine image dimensions for/);

      await assert.rejects(
        async () => await resolveImageDimensionsAsync(outOfBoundsPath),
        /Cannot determine image dimensions for/
      );
    } finally {
      if (fs.existsSync(outOfBoundsPath)) {
        fs.unlinkSync(outOfBoundsPath);
      }
    }
  });
});
describe('resolveImageDimensions', (): void => {
  const validImagePath = join(testOutputDir, 'test-image.png');
  const invalidImagePath = join(testOutputDir, 'invalid-image.txt');
  const nonExistentImagePath = join(testOutputDir, 'non-existent.png');

  before(() => {
    mkdirSync(testOutputDir, { recursive: true });

    // Create a valid 200x100 PNG image
    const canvas = createCanvas(200, 100);
    const buffer = canvas.toBuffer('image/png');
    writeFileSync(validImagePath, buffer);

    // Create an invalid/corrupt image file
    writeFileSync(invalidImagePath, 'not an image content');
  });

  after(() => {
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('explicit dimensions', (): void => {
    it('returns explicit width and height when both are provided for local file', (): void => {
      const dimensions = resolveImageDimensions(validImagePath, 300, 150);
      assert.deepStrictEqual(dimensions, { width: 300, height: 150 });
    });

    it('returns explicit width and height when both are provided for non-existent file', (): void => {
      const dimensions = resolveImageDimensions(nonExistentImagePath, 500, 250);
      assert.deepStrictEqual(dimensions, { width: 500, height: 250 });
    });

    it('returns explicit width and height when both are provided for http network image', (): void => {
      const dimensions = resolveImageDimensions('http://example.com/image.png', 400, 200);
      assert.deepStrictEqual(dimensions, { width: 400, height: 200 });
    });

    it('returns explicit width and height when both are provided for https network image', (): void => {
      const dimensions = resolveImageDimensions('https://example.com/image.jpg', 800, 600);
      assert.deepStrictEqual(dimensions, { width: 800, height: 600 });
    });
  });

  describe('intrinsic dimensions for local files', (): void => {
    it('returns intrinsic dimensions when no explicit dimensions are provided', (): void => {
      const dimensions = resolveImageDimensions(validImagePath);
      assert.deepStrictEqual(dimensions, { width: 200, height: 100 });
    });

    it('calculates height from aspect ratio when only explicit width is provided', (): void => {
      // 200x100 intrinsic -> aspect ratio height/width = 0.5
      // width 100 -> height 50
      const dimensions = resolveImageDimensions(validImagePath, 100);
      assert.deepStrictEqual(dimensions, { width: 100, height: 50 });
    });

    it('calculates width from aspect ratio when only explicit height is provided', (): void => {
      // 200x100 intrinsic -> aspect ratio width/height = 2.0
      // height 300 -> width 600
      const dimensions = resolveImageDimensions(validImagePath, undefined, 300);
      assert.deepStrictEqual(dimensions, { width: 600, height: 300 });
    });

    it('resolves relative path to local file correctly', (): void => {
      const relativePath = join('.tmp', 'image-dimensions-tests', 'test-image.png');
      const dimensions = resolveImageDimensions(relativePath);
      assert.deepStrictEqual(dimensions, { width: 200, height: 100 });
    });
  });

  describe('network URLs without complete explicit dimensions', (): void => {
    it('throws error when no dimensions are provided for http URL', (): void => {
      assert.throws(() => resolveImageDimensions('http://example.com/image.png'), /Image dimensions required for network images/);
    });

    it('throws error when no dimensions are provided for https URL', (): void => {
      assert.throws(() => resolveImageDimensions('https://example.com/image.png'), /Image dimensions required for network images/);
    });

    it('throws error when only width is provided for network URL', (): void => {
      assert.throws(() => resolveImageDimensions('https://example.com/image.png', 100), /Image dimensions required for network images/);
    });

    it('throws error when only height is provided for network URL', (): void => {
      assert.throws(() => resolveImageDimensions('https://example.com/image.png', undefined, 100), /Image dimensions required for network images/);
    });
  });

  describe('error handling for invalid local files', (): void => {
    it('throws error when local file does not exist and no explicit dimensions given', (): void => {
      assert.throws(() => resolveImageDimensions(nonExistentImagePath), /Cannot determine image dimensions/);
    });

    it('throws error when local file does not exist and only width is given', (): void => {
      assert.throws(() => resolveImageDimensions(nonExistentImagePath, 100), /Cannot determine image dimensions/);
    });

    it('throws error when local file does not exist and only height is given', (): void => {
      assert.throws(() => resolveImageDimensions(nonExistentImagePath, undefined, 100), /Cannot determine image dimensions/);
    });

    it('throws error for corrupted or non-image local file', (): void => {
      assert.throws(() => resolveImageDimensions(invalidImagePath), /Cannot determine image dimensions/);
    });
  });
});

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
