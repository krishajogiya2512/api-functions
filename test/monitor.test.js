import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { monitor } from '../src/monitor.js';

test('ApiPulse Studio Test Suite', async (t) => {
  const app = createApp();
  let server;
  let baseUrl;

  await t.test('Start test server', async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
    assert.ok(baseUrl, 'Server port should be assigned');
  });

  await t.test('Reset monitor stats before running tests', () => {
    monitor.resetStats();
    const stats = monitor.getStats();
    assert.equal(stats.totalRequests, 0);
    assert.equal(stats.slowRequests, 0);
  });

  await t.test('Health check should be ignored by ApiPulse', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);

    const stats = monitor.getStats();
    assert.equal(stats.totalRequests, 0, 'Health endpoint should be excluded via ignorePaths');
  });

  await t.test('Normal API requests should be tracked', async () => {
    const res = await fetch(`${baseUrl}/api/v1/products`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    const stats = monitor.getStats();
    assert.equal(stats.totalRequests, 1);
    assert.equal(stats.successfulRequests, 1);
    assert.equal(stats.methods.GET, 1);
  });

  await t.test('Route pattern grouping should group parameterized routes', async () => {
    await fetch(`${baseUrl}/api/v1/products/prod_101`);
    await fetch(`${baseUrl}/api/v1/products/prod_102`);

    const endpoints = monitor.getEndpointStats();
    assert.ok(endpoints['GET /api/v1/products/:id'], 'Route pattern should be GET /api/v1/products/:id');
    assert.equal(endpoints['GET /api/v1/products/:id'].requests, 2);
  });

  await t.test('Validation failure (400) should be tracked as client error', async () => {
    const res = await fetch(`${baseUrl}/api/v1/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Missing required name and price' })
    });
    assert.equal(res.status, 400);

    const stats = monitor.getStats();
    assert.ok(stats.clientErrors >= 1, 'Client error should be recorded');
    assert.equal(stats.statusCodes['400'], 1);
  });

  await t.test('404 Not Found requests should be tracked', async () => {
    const res = await fetch(`${baseUrl}/api/v1/nonexistent-route-404`);
    assert.equal(res.status, 404);

    const stats = monitor.getStats();
    assert.ok(stats.statusCodes['404'] >= 1);
    assert.ok(stats.failedRequests >= 1);
  });

  await t.test('Slow requests (> 400ms) should trigger slow request metric', async () => {
    const res = await fetch(`${baseUrl}/api/v1/analytics/report`);
    assert.equal(res.status, 200);

    const stats = monitor.getStats();
    assert.ok(stats.slowRequests >= 1, 'Slow request count should be incremented');
    assert.ok(stats.responseTime.max >= 400, 'Max response time should be >= 400ms');
  });

  await t.test('Reset stats clears all counters', () => {
    monitor.resetStats();
    const stats = monitor.getStats();
    assert.equal(stats.totalRequests, 0);
    assert.equal(stats.successfulRequests, 0);
    assert.equal(stats.failedRequests, 0);
    assert.equal(stats.slowRequests, 0);
    assert.deepEqual(stats.endpoints, {});
  });

  await t.test('Stop test server', async () => {
    await new Promise((resolve) => server.close(resolve));
  });
});
