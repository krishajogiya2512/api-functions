/**
 * CLI Traffic Generator for ApiPulse Studio
 * Usage: node scripts/generate-traffic.js [requests] [concurrency]
 */

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const TOTAL_REQUESTS = parseInt(process.argv[2] || '50', 10);
const CONCURRENCY = parseInt(process.argv[3] || '5', 10);

const scenarios = [
  { method: 'GET', path: '/api/v1/products' },
  { method: 'GET', path: '/api/v1/products/prod_101' },
  { method: 'GET', path: '/api/v1/products/prod_102' },
  { method: 'GET', path: '/api/v1/users/usr_001/profile' },
  { method: 'POST', path: '/api/v1/orders/checkout', body: { items: [{ productId: 'prod_101', quantity: 2 }] } },
  { method: 'GET', path: '/api/v1/analytics/report' }, // triggers slow request alert (>400ms)
  { method: 'POST', path: '/api/v1/billing/charge', body: { amount: 120 } },
  { method: 'GET', path: '/api/v1/products/prod_nonexistent_999' }, // triggers 404
  { method: 'POST', path: '/api/v1/auth/login', body: { username: 'test', password: 'bad' } } // triggers 401
];

async function runSingleRequest(index) {
  const scenario = scenarios[index % scenarios.length];
  const url = `${BASE_URL}${scenario.path}`;
  const start = performance.now();

  const options = {
    method: scenario.method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (scenario.body) {
    options.body = JSON.stringify(scenario.body);
  }

  try {
    const res = await fetch(url, options);
    await res.text();
    const duration = Math.round(performance.now() - start);
    return { success: true, status: res.status, path: scenario.path, duration };
  } catch (err) {
    const duration = Math.round(performance.now() - start);
    return { success: false, error: err.message, path: scenario.path, duration };
  }
}

async function main() {
  console.log(`\n🚀 Starting ApiPulse traffic generator...`);
  console.log(`   Target Server: ${BASE_URL}`);
  console.log(`   Total Calls:   ${TOTAL_REQUESTS}`);
  console.log(`   Concurrency:   ${CONCURRENCY}\n`);

  const startTime = Date.now();
  let completed = 0;
  const results = [];

  async function worker() {
    while (completed < TOTAL_REQUESTS) {
      const idx = completed++;
      const result = await runSingleRequest(idx);
      results.push(result);
      process.stdout.write(`\r[${completed}/${TOTAL_REQUESTS}] ${result.path} -> HTTP ${result.status || 'ERR'} (${result.duration}ms)    `);
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n\n✅ Finished generating ${TOTAL_REQUESTS} requests in ${totalTime}s (~${(TOTAL_REQUESTS / totalTime).toFixed(1)} req/s)`);

  // Fetch updated stats from ApiPulse
  try {
    const statsRes = await fetch(`${BASE_URL}/api/monitor/stats`);
    const stats = await statsRes.json();
    console.log('\n📊 Latest ApiPulse Observability Snapshot:');
    console.log(`   Total Requests:      ${stats.data.totalRequests}`);
    console.log(`   Success Rate:        ${((stats.data.successfulRequests / stats.data.totalRequests) * 100).toFixed(1)}%`);
    console.log(`   Failure Rate:        ${stats.data.failureRate}%`);
    console.log(`   P50 (Median):        ${stats.data.responseTime.p50} ms`);
    console.log(`   P95:                 ${stats.data.responseTime.p95} ms`);
    console.log(`   Average Latency:     ${stats.data.responseTime.average} ms`);
    console.log(`   Slow Requests:       ${stats.data.slowRequests}`);
    console.log(`   Monitored Endpoints: ${Object.keys(stats.data.endpoints).length}\n`);
  } catch {
    // Ignore fetch error
  }
}

main().catch(console.error);
