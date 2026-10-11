import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { handleVersionHelp, readPkg } from '../../../src/setup/version-help.ts';

const pkgJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));

describe('version-help setup', () => {
  describe('readPkg', () => {
    it('returns package metadata matching package.json', () => {
      const pkg = readPkg();
      assert.strictEqual(pkg.name, pkgJson.name);
      assert.strictEqual(pkg.version, pkgJson.version);
    });
  });

  describe('handleVersionHelp', () => {
    it('handles --version flag', () => {
      const result = handleVersionHelp(['node', 'server.js', '--version']);
      assert.strictEqual(result.handled, true);
      assert.strictEqual(result.output, pkgJson.version);
    });

    it('handles -v short flag', () => {
      const result = handleVersionHelp(['node', 'server.js', '-v']);
      assert.strictEqual(result.handled, true);
      assert.strictEqual(result.output, pkgJson.version);
    });

    it('handles --help flag', () => {
      const result = handleVersionHelp(['node', 'server.js', '--help']);
      assert.strictEqual(result.handled, true);
      assert.ok(result.output);
      assert.ok(result.output.includes('Usage: mcp-pdf'));
      assert.ok(result.output.includes('--version, -v'));
      assert.ok(result.output.includes('--help, -h'));
    });

    it('handles -h short flag', () => {
      const result = handleVersionHelp(['node', 'server.js', '-h']);
      assert.strictEqual(result.handled, true);
      assert.ok(result.output);
      assert.ok(result.output.includes('Usage: mcp-pdf'));
    });

    it('returns handled: false when neither version nor help flag is passed', () => {
      const result = handleVersionHelp(['node', 'server.js', '--port=3000', '--log-level=debug']);
      assert.strictEqual(result.handled, false);
      assert.strictEqual(result.output, undefined);
    });

    it('returns handled: false for empty args', () => {
      const result = handleVersionHelp([]);
      assert.strictEqual(result.handled, false);
      assert.strictEqual(result.output, undefined);
    });

    it('handles --version when combined with other arguments', () => {
      const result = handleVersionHelp(['node', 'server.js', '--port=3000', '--version']);
      assert.strictEqual(result.handled, true);
      assert.strictEqual(result.output, pkgJson.version);
    });

    it('handles --help when combined with other arguments', () => {
      const result = handleVersionHelp(['node', 'server.js', '--port=3000', '--help']);
      assert.strictEqual(result.handled, true);
      assert.ok(result.output && result.output.includes('Usage: mcp-pdf'));
    });
  });
});
