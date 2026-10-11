import assert from 'assert';
import { handleVersionHelp, readPkg } from '../../../src/setup/version-help.ts';

describe('Version and Help Handler', () => {
  it('reads package metadata lazily and correctly', () => {
    const pkg = readPkg();
    assert.ok(pkg.name);
    assert.ok(pkg.version);
    assert.strictEqual(pkg.name, '@mcp-z/mcp-pdf');

    // Calling readPkg again should return the same cached reference
    const pkg2 = readPkg();
    assert.strictEqual(pkg, pkg2);
  });

  it('handles --version flag', () => {
    const pkg = readPkg();
    const result = handleVersionHelp(['--version']);
    assert.strictEqual(result.handled, true);
    assert.strictEqual(result.output, pkg.version);

    const resultShort = handleVersionHelp(['-v']);
    assert.strictEqual(resultShort.handled, true);
    assert.strictEqual(resultShort.output, pkg.version);
  });

  it('handles --help flag', () => {
    const result = handleVersionHelp(['--help']);
    assert.strictEqual(result.handled, true);
    assert.ok(result.output?.includes('Usage: mcp-pdf [options]'));

    const resultShort = handleVersionHelp(['-h']);
    assert.strictEqual(resultShort.handled, true);
    assert.ok(resultShort.output?.includes('Usage: mcp-pdf [options]'));
  });

  it('returns unhandled for regular args', () => {
    const result = handleVersionHelp(['--port=3000']);
    assert.strictEqual(result.handled, false);
    assert.strictEqual(result.output, undefined);
  });
});
