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
