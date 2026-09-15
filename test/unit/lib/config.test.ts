import assert from 'assert';
import { createConfig, handleVersionHelp, parseConfig } from '../../../src/setup/config.ts';

describe('Config parsing', () => {
  describe('BASE_URL parsing', () => {
    it('parses BASE_URL env var', () => {
      const config = parseConfig([], {
        BASE_URL: 'https://api.example.com',
      });
      assert.strictEqual(config.baseUrl, 'https://api.example.com');
    });

    it('parses --base-url CLI arg', () => {
      const config = parseConfig(['--base-url=https://api.example.com'], {});
      assert.strictEqual(config.baseUrl, 'https://api.example.com');
    });

    it('CLI arg overrides env var', () => {
      const config = parseConfig(['--base-url=https://cli.example.com'], {
        BASE_URL: 'https://env.example.com',
      });
      assert.strictEqual(config.baseUrl, 'https://cli.example.com');
    });

    it('baseUrl is undefined when not provided', () => {
      const config = createConfig();
      assert.strictEqual(config.baseUrl, undefined);
    });
  });

  describe('resourceStoreUri parsing', () => {
    it('uses RESOURCE_STORE_URI env var', () => {
      const config = parseConfig([], {
        RESOURCE_STORE_URI: 'file:///custom/path',
      });
      assert.ok(config.resourceStoreUri.startsWith('file://'));
      assert.ok(config.resourceStoreUri.endsWith('/custom/path'));
    });

    it('defaults to ~/.mcp-z/pdf/files when not provided', () => {
      const config = createConfig();
      assert.ok(config.resourceStoreUri.startsWith('file://'));
      assert.ok(config.resourceStoreUri.includes('.mcp-z'));
      assert.ok(config.resourceStoreUri.includes('pdf'));
    });

    it('expands tilde in path', () => {
      const config = parseConfig([], {
        RESOURCE_STORE_URI: 'file://~/my-pdfs',
      });
      assert.ok(!config.resourceStoreUri.startsWith('~'));
      assert.ok(config.resourceStoreUri.includes('my-pdfs'));
      assert.ok(config.resourceStoreUri.startsWith('file://'));
    });
  });

  describe('logLevel parsing', () => {
    it('parses LOG_LEVEL env var', () => {
      const config = parseConfig([], {
        LOG_LEVEL: 'debug',
      });
      assert.strictEqual(config.logLevel, 'debug');
    });

    it('parses --log-level CLI arg', () => {
      const config = parseConfig(['--log-level=warn'], {});
      assert.strictEqual(config.logLevel, 'warn');
    });

    it('CLI arg overrides env var', () => {
      const config = parseConfig(['--log-level=error'], {
        LOG_LEVEL: 'debug',
      });
      assert.strictEqual(config.logLevel, 'error');
    });

    it('defaults to info when not provided', () => {
      const config = createConfig();
      assert.strictEqual(config.logLevel, 'info');
    });
  });

  describe('transport parsing', () => {
    it('defaults to stdio transport', () => {
      const config = createConfig();
      assert.strictEqual(config.transport.type, 'stdio');
    });

    it('parses --port for HTTP transport', () => {
      const config = parseConfig(['--port=3457'], {});
      assert.strictEqual(config.transport.type, 'http');
      assert.strictEqual(config.transport.port, 3457);
    });

    it('parses PORT env var for HTTP transport', () => {
      const config = parseConfig([], { PORT: '3457' });
      assert.strictEqual(config.transport.type, 'http');
      assert.strictEqual(config.transport.port, 3457);
    });
  });

  describe('handleVersionHelp handling', () => {
    it('handles --version flag', () => {
      const result = handleVersionHelp(['node', 'script', '--version']);
      assert.strictEqual(result.handled, true);
      assert.strictEqual(typeof result.output, 'string');
    });

    it('handles --help flag', () => {
      const result = handleVersionHelp(['node', 'script', '--help']);
      assert.strictEqual(result.handled, true);
      assert.ok(result.output?.includes('Usage: mcp-pdf'));
    });

    it('returns unhandled when flags are absent', () => {
      const result = handleVersionHelp(['node', 'script']);
      assert.strictEqual(result.handled, false);
      assert.strictEqual(result.output, undefined);
    });
  });
});
