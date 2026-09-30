import { setup } from '@mcp-z/mcp-pdf';
import assert from 'assert';
import { mkdirSync } from 'fs';
import { safeRmSync } from 'fs-remove-compat';
import getPort from 'get-port';
import * as path from 'path';
import { createTestConfig } from '../../lib/create-test-config.ts';

describe('HTTP Server CORS Configuration', () => {
  const testOutputDir = path.join(process.cwd(), '.tmp', 'http-cors-test');
  const testStorageDir = path.join(testOutputDir, 'storage');

  before(() => {
    mkdirSync(testStorageDir, { recursive: true });
  });

  after(() => {
    safeRmSync(testOutputDir, { recursive: true, force: true });
  });

  it('restricts CORS on /files endpoint when baseUrl is configured', async () => {
    const port = await getPort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const config = createTestConfig(testOutputDir, testStorageDir, {
      type: 'http',
      port,
    });
    config.baseUrl = baseUrl;

    const server = await setup.createHTTPServer(config);

    try {
      // Allowed origin request
      const allowedRes = await fetch(`${baseUrl}/files/nonexistent.pdf`, {
        headers: { Origin: baseUrl },
      });
      assert.strictEqual(allowedRes.headers.get('access-control-allow-origin'), baseUrl);

      // Disallowed origin request
      const disallowedRes = await fetch(`${baseUrl}/files/nonexistent.pdf`, {
        headers: { Origin: 'http://untrusted-domain.com' },
      });
      assert.strictEqual(disallowedRes.headers.get('access-control-allow-origin'), null);
    } finally {
      await server.close();
    }
  });

  it('blocks cross-origin requests on /files endpoint when baseUrl is not configured', async () => {
    const port = await getPort();
    const serverUrl = `http://127.0.0.1:${port}`;
    const config = createTestConfig(testOutputDir, testStorageDir, {
      type: 'http',
      port,
    });
    config.baseUrl = undefined;

    const server = await setup.createHTTPServer(config);

    try {
      const res = await fetch(`${serverUrl}/files/nonexistent.pdf`, {
        headers: { Origin: 'http://any-domain.com' },
      });
      assert.strictEqual(res.headers.get('access-control-allow-origin'), null);
    } finally {
      await server.close();
    }
  });
});
