import assert from 'node:assert';
import { describe, it } from 'node:test';
import { ensureString } from '../../../src/lib/formatting.ts';

describe('ensureString', () => {
  it('returns string as-is', () => {
    assert.strictEqual(ensureString('hello'), 'hello');
    assert.strictEqual(ensureString(''), '');
  });

  it('returns empty string for null and undefined', () => {
    assert.strictEqual(ensureString(null), '');
    assert.strictEqual(ensureString(undefined), '');
  });

  it('converts non-string values to string', () => {
    assert.strictEqual(ensureString(123), '123');
    assert.strictEqual(ensureString(true), 'true');
    assert.strictEqual(ensureString(false), 'false');
    assert.strictEqual(ensureString({ toString: () => 'custom' }), 'custom');
  });
});
