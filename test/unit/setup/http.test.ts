import assert from 'assert';
import http from 'http';
import { parseConfig } from '../../../src/setup/config.ts';
import { createHTTPServer } from '../../../src/setup/http.ts';
import type { ServerConfig } from '../../../src/types.ts';

describe('HTTP Server CORS Configuration', () => {
  let serverInstance: { close: () => Promise<void>; httpServer: http.Server } | undefined;
  let testPort = 9876;

  afterEach(async () => {
    if (serverInstance) {
      await serverInstance.close();
      serverInstance = undefined;
    }
  });

  function getBaseConfig(corsOrigin?: string | string[]): ServerConfig {
    testPort++;
    const config = parseConfig([`--port=${testPort}`], {
      RESOURCE_STORE_URI: 'file:///tmp/mcp-pdf-test-store',
      BASE_URL: `http://localhost:${testPort}`,
    });
    if (corsOrigin !== undefined) {
      config.corsOrigin = corsOrigin;
    }
    return config;
  }

  it('restricts CORS by default when corsOrigin is not configured', async () => {
    const config = getBaseConfig();
    serverInstance = await createHTTPServer(config);

    const res = await fetch(`http://localhost:${testPort}/files`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://malicious.example.com',
        'Access-Control-Request-Method': 'GET',
      },
    });

    const allowOrigin = res.headers.get('access-control-allow-origin');
    assert.strictEqual(allowOrigin, null, 'Should not reflect untrusted origin when CORS is restricted');
  });

  it('allows single configured origin', async () => {
    const config = getBaseConfig('https://allowed.example.com');
    serverInstance = await createHTTPServer(config);

    const res = await fetch(`http://localhost:${testPort}/files`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://allowed.example.com',
        'Access-Control-Request-Method': 'GET',
      },
    });

    const allowOrigin = res.headers.get('access-control-allow-origin');
    assert.strictEqual(allowOrigin, 'https://allowed.example.com');

    const resOther = await fetch(`http://localhost:${testPort}/files`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://disallowed.example.com',
        'Access-Control-Request-Method': 'GET',
      },
    });

    // When configured with a static origin string, cors middleware sets Access-Control-Allow-Origin to that static string,
    // which browsers enforce by blocking requests from any other origin.
    assert.strictEqual(resOther.headers.get('access-control-allow-origin'), 'https://allowed.example.com');
  });

  it('allows multiple configured origins', async () => {
    const origins = ['https://app1.example.com', 'https://app2.example.com'];
    const config = getBaseConfig(origins);
    serverInstance = await createHTTPServer(config);

    const res1 = await fetch(`http://localhost:${testPort}/files`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://app1.example.com',
        'Access-Control-Request-Method': 'GET',
      },
    });
    assert.strictEqual(res1.headers.get('access-control-allow-origin'), 'https://app1.example.com');

    const res2 = await fetch(`http://localhost:${testPort}/files`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://app2.example.com',
        'Access-Control-Request-Method': 'GET',
      },
    });
    assert.strictEqual(res2.headers.get('access-control-allow-origin'), 'https://app2.example.com');

    const res3 = await fetch(`http://localhost:${testPort}/files`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://app3.example.com',
        'Access-Control-Request-Method': 'GET',
      },
    });
    assert.strictEqual(res3.headers.get('access-control-allow-origin'), null);
  });
});
