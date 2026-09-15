import assert from 'assert';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createCanvas } from '@napi-rs/canvas';
import { resolveImageDimensions } from '../../../src/lib/image-dimensions.ts';

// Use .tmp/ in package root per QUALITY.md rule T8
const testOutputDir = join(process.cwd(), '.tmp', 'image-dimensions-tests');

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
      assert.throws(
        () => resolveImageDimensions('http://example.com/image.png'),
        /Image dimensions required for network images/
      );
    });

    it('throws error when no dimensions are provided for https URL', (): void => {
      assert.throws(
        () => resolveImageDimensions('https://example.com/image.png'),
        /Image dimensions required for network images/
      );
    });

    it('throws error when only width is provided for network URL', (): void => {
      assert.throws(
        () => resolveImageDimensions('https://example.com/image.png', 100),
        /Image dimensions required for network images/
      );
    });

    it('throws error when only height is provided for network URL', (): void => {
      assert.throws(
        () => resolveImageDimensions('https://example.com/image.png', undefined, 100),
        /Image dimensions required for network images/
      );
    });
  });

  describe('error handling for invalid local files', (): void => {
    it('throws error when local file does not exist and no explicit dimensions given', (): void => {
      assert.throws(
        () => resolveImageDimensions(nonExistentImagePath),
        /Cannot determine image dimensions/
      );
    });

    it('throws error when local file does not exist and only width is given', (): void => {
      assert.throws(
        () => resolveImageDimensions(nonExistentImagePath, 100),
        /Cannot determine image dimensions/
      );
    });

    it('throws error when local file does not exist and only height is given', (): void => {
      assert.throws(
        () => resolveImageDimensions(nonExistentImagePath, undefined, 100),
        /Cannot determine image dimensions/
      );
    });

    it('throws error for corrupted or non-image local file', (): void => {
      assert.throws(
        () => resolveImageDimensions(invalidImagePath),
        /Cannot determine image dimensions/
      );
    });
  });
});
