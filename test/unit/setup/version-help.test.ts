import assert from 'assert';
import { handleVersionHelp, readPkg } from '../../../src/setup/version-help.ts';

describe('Version and Help handler', () => {
  it('reads package metadata correctly', () => {
    const pkg = readPkg();
    assert.strictEqual(typeof pkg.name, 'string');
    assert.strictEqual(typeof pkg.version, 'string');
    assert.ok(pkg.name.length > 0);
  });

  it('handles --version flag', () => {
    const pkg = readPkg();
    const result = handleVersionHelp(['node', 'mcp-pdf', '--version']);
    assert.strictEqual(result.handled, true);
    assert.strictEqual(result.output, pkg.version);
  });

  it('handles -v short flag', () => {
    const pkg = readPkg();
    const result = handleVersionHelp(['node', 'mcp-pdf', '-v']);
    assert.strictEqual(result.handled, true);
    assert.strictEqual(result.output, pkg.version);
  });

  it('handles --help flag', () => {
    const result = handleVersionHelp(['node', 'mcp-pdf', '--help']);
    assert.strictEqual(result.handled, true);
    assert.ok(result.output?.includes('Usage: mcp-pdf'));
  });

  it('handles -h short flag', () => {
    const result = handleVersionHelp(['node', 'mcp-pdf', '-h']);
    assert.strictEqual(result.handled, true);
    assert.ok(result.output?.includes('Usage: mcp-pdf'));
  });

  it('returns handled: false when no version or help flag is passed', () => {
    const result = handleVersionHelp(['node', 'mcp-pdf']);
    assert.strictEqual(result.handled, false);
    assert.strictEqual(result.output, undefined);
  });
});
