import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { createDefaultRuntime, createLogger, createLoggingLayer, createStorageLayer } from '../../../src/setup/runtime.ts';
import type { ServerConfig, StorageContext } from '../../../src/types.ts';

describe('runtime setup', () => {
  const testBaseDir = path.join('.tmp', `runtime-test-${Date.now()}`);

  const baseConfig: ServerConfig = {
    name: 'mcp-pdf-test',
    version: '1.0.0',
    baseDir: testBaseDir,
    resourceStoreUri: `file://${path.resolve(testBaseDir, 'files')}`,
    logLevel: 'info',
    transport: {
      type: 'stdio',
    },
  };

  afterEach(() => {
    if (fs.existsSync(testBaseDir)) {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    }
  });

  describe('createLogger', () => {
    it('creates log directory and logger for stdio transport', () => {
      const logger = createLogger(baseConfig);
      assert.ok(logger);
      const logDir = path.join(testBaseDir, 'logs');
      assert.ok(fs.existsSync(logDir));
    });

    it('creates logger for non-stdio transport', () => {
      const httpConfig: ServerConfig = {
        ...baseConfig,
        transport: {
          type: 'http',
          port: 3000,
        },
      };
      const logger = createLogger(httpConfig);
      assert.ok(logger);
    });

    it('respects logLevel configuration', () => {
      const debugConfig: ServerConfig = {
        ...baseConfig,
        logLevel: 'debug',
      };
      const logger = createLogger(debugConfig);
      assert.strictEqual(logger.level, 'debug');
    });
  });

  describe('createLoggingLayer', () => {
    it('returns middleware layer with tool, resource, and prompt logging', () => {
      const logger = createLogger(baseConfig);
      const layer = createLoggingLayer(logger);

      assert.strictEqual(typeof layer.withTool, 'function');
      assert.strictEqual(typeof layer.withResource, 'function');
      assert.strictEqual(typeof layer.withPrompt, 'function');
    });
  });

  describe('createStorageLayer', () => {
    it('wraps tool module handler and injects storageContext', async () => {
      const storageContext: StorageContext = {
        resourceStoreUri: 'file:///tmp/store',
        transport: { type: 'stdio' },
      };

      const storageLayer = createStorageLayer(storageContext);

      let capturedExtra: unknown = null;
      const dummyTool = {
        name: 'test_tool',
        config: {},
        handler: async (_args: unknown, extra: unknown) => {
          capturedExtra = extra;
          return { content: [{ type: 'text', text: 'success' }] };
        },
      };

      const wrappedTool = storageLayer.withTool?.(dummyTool as any);
      assert.strictEqual(wrappedTool.name, 'test_tool');

      const extraObj: { [key: string]: unknown } = { existing: 'value' };
      await wrappedTool.handler({}, extraObj);

      assert.strictEqual((capturedExtra as any).existing, 'value');
      assert.strictEqual((capturedExtra as any).storageContext, storageContext);
    });
  });

  describe('createDefaultRuntime', () => {
    it('throws error if http transport lacks baseUrl and port', async () => {
      const invalidConfig: ServerConfig = {
        ...baseConfig,
        transport: {
          type: 'http',
        },
      };

      await assert.rejects(
        async () => {
          await createDefaultRuntime(invalidConfig);
        },
        {
          message: 'pdf-document: HTTP/WS transport requires either baseUrl in server config or port in transport config.',
        }
      );
    });

    it('throws error if resourceStoreUri is missing', async () => {
      const invalidConfig: ServerConfig = {
        ...baseConfig,
        resourceStoreUri: '',
      };

      await assert.rejects(
        async () => {
          await createDefaultRuntime(invalidConfig);
        },
        {
          message: 'pdf-document: Server configuration missing resourceStoreUri.',
        }
      );
    });

    it('creates default runtime with default domain modules and middleware', async () => {
      const runtime = await createDefaultRuntime(baseConfig);

      assert.strictEqual(runtime.deps.config, baseConfig);
      assert.ok(runtime.deps.logger);
      assert.strictEqual(runtime.middlewareFactories.length, 2);

      const domainModules = runtime.createDomainModules();
      assert.ok(Array.isArray(domainModules.tools));
      assert.ok(domainModules.tools.length > 0);
      assert.ok(Array.isArray(domainModules.resources));
      assert.ok(Array.isArray(domainModules.prompts));
      assert.ok(domainModules.prompts.length > 0);

      await runtime.close();
    });

    it('supports overrides for createDomainModules and middlewareFactories', async () => {
      const customTool = { name: 'custom_tool', config: {}, handler: async () => ({}) };
      const overrides = {
        createDomainModules: () => ({
          tools: [customTool as any],
          resources: [],
          prompts: [],
        }),
        middlewareFactories: [() => ({})],
      };

      const runtime = await createDefaultRuntime(baseConfig, overrides);

      assert.strictEqual(runtime.middlewareFactories.length, 1);
      const domainModules = runtime.createDomainModules();
      assert.strictEqual(domainModules.tools.length, 1);
      assert.strictEqual(domainModules.tools[0].name, 'custom_tool');

      await runtime.close();
    });
  });
});
