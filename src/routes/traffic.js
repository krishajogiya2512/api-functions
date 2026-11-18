import { Router } from 'express';

const router = Router();

let continuousInterval = null;
let continuousRunning = false;
let continuousStats = {
  startedAt: null,
  totalGenerated: 0
};

// Available realistic scenarios
const scenarios = [
  // Fast normal requests
  { method: 'GET', path: '/api/v1/products', weight: 35 },
  { method: 'GET', path: '/api/v1/products/prod_101', weight: 20 },
  { method: 'GET', path: '/api/v1/products/prod_102', weight: 15 },
  { method: 'GET', path: '/api/v1/users/usr_001/profile', weight: 10 },
  // Moderate checkout
  {
    method: 'POST',
    path: '/api/v1/orders/checkout',
    body: { items: [{ productId: 'prod_101', quantity: 1, price: 299.99 }] },
    weight: 8
  },
  // Slow analytics query
  { method: 'GET', path: '/api/v1/analytics/report', weight: 5 },
  // Occasional billing transaction
  {
    method: 'POST',
    path: '/api/v1/billing/charge',
    body: { amount: 150.00, currency: 'USD' },
    weight: 4
  },
  // 404 Not Found error
  { method: 'GET', path: '/api/v1/legacy/catalog-v0', weight: 2 },
  // 400 Bad Request error
  { method: 'POST', path: '/api/v1/products', body: { description: 'Missing name and price' }, weight: 2 },
  // 401 Unauthorized
  { method: 'POST', path: '/api/v1/auth/login', body: { username: 'intruder', password: 'wrong' }, weight: 2 }
];

function pickScenario() {
  const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  for (const s of scenarios) {
    if (random < s.weight) return s;
    random -= s.weight;
  }
  return scenarios[0];
}

async function executeRequest(port, scenario) {
  const url = `http://127.0.0.1:${port}${scenario.path}`;
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
    return { path: scenario.path, status: res.status };
  } catch (err) {
    return { path: scenario.path, error: err.message };
  }
}

/**
 * POST /api/traffic/simulate
 * Run a specific traffic simulation batch
 */
router.post('/simulate', async (req, res) => {
  const port = req.app.get('port') || 3000;
  const { preset = 'mixed-chaos', count = 20 } = req.body || {};
  const requestedCount = Math.min(Math.max(Number(count) || 20, 1), 100);

  let targetScenarios = [];

  if (preset === 'traffic-surge') {
    // Normal healthy traffic (GETs and valid checkouts)
    targetScenarios = scenarios.filter((s) => !s.path.includes('legacy') && !s.body?.description && s.path !== '/api/v1/analytics/report');
  } else if (preset === 'slow-spike') {
    // Heavy analytics queries taking > 400ms
    targetScenarios = [
      { method: 'GET', path: '/api/v1/analytics/report' },
      { method: 'POST', path: '/api/v1/orders/checkout', body: { items: [{ productId: 'prod_101', quantity: 3, price: 899.97 }] } }
    ];
  } else if (preset === 'error-storm') {
    // Deliberate 4xx and 5xx errors
    targetScenarios = [
      { method: 'GET', path: '/api/v1/legacy/deprecated-endpoint' },
      { method: 'GET', path: '/api/v1/products/prod_missing_9999' },
      { method: 'POST', path: '/api/v1/products', body: { invalid: true } },
      { method: 'POST', path: '/api/v1/auth/login', body: { username: 'test', password: 'bad' } },
      { method: 'POST', path: '/api/v1/billing/charge', body: { amount: 100 }, query: '?fail=true' },
      { method: 'GET', path: '/api/v1/chaos/flaky?rate=1.0' }
    ];
  } else {
    // Mixed chaos
    targetScenarios = scenarios;
  }

  const results = [];
  for (let i = 0; i < requestedCount; i++) {
    const picked = targetScenarios[Math.floor(Math.random() * targetScenarios.length)];
    const pathWithQuery = picked.query ? `${picked.path}${picked.query}` : picked.path;
    const item = await executeRequest(port, { ...picked, path: pathWithQuery });
    results.push(item);
  }

  continuousStats.totalGenerated += results.length;

  res.json({
    success: true,
    preset,
    executedCount: results.length,
    resultsSummary: results.reduce((acc, curr) => {
      const key = curr.status ? `status_${curr.status}` : 'network_error';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  });
});

/**
 * POST /api/traffic/continuous/start
 * Start background recurring traffic
 */
router.post('/continuous/start', (req, res) => {
  const port = req.app.get('port') || 3000;
  const ratePerSecond = Math.min(Math.max(Number(req.body?.rate) || 2, 1), 10);

  if (continuousRunning) {
    return res.json({
      success: true,
      message: 'Continuous simulation is already active',
      status: { running: true, startedAt: continuousStats.startedAt, totalGenerated: continuousStats.totalGenerated }
    });
  }

  continuousRunning = true;
  continuousStats.startedAt = new Date().toISOString();

  const intervalMs = Math.round(1000 / ratePerSecond);
  continuousInterval = setInterval(async () => {
    if (!continuousRunning) return;
    const scenario = pickScenario();
    await executeRequest(port, scenario);
    continuousStats.totalGenerated++;
  }, intervalMs);

  res.json({
    success: true,
    message: `Continuous traffic simulation started at ~${ratePerSecond} req/s`,
    status: { running: true, ratePerSecond, startedAt: continuousStats.startedAt }
  });
});

/**
 * POST /api/traffic/continuous/stop
 * Stop background traffic
 */
router.post('/continuous/stop', (req, res) => {
  if (continuousInterval) {
    clearInterval(continuousInterval);
    continuousInterval = null;
  }
  continuousRunning = false;

  res.json({
    success: true,
    message: 'Continuous traffic generator stopped',
    status: { running: false, totalGenerated: continuousStats.totalGenerated }
  });
});

/**
 * GET /api/traffic/continuous/status
 */
router.get('/continuous/status', (req, res) => {
  res.json({
    success: true,
    status: {
      running: continuousRunning,
      startedAt: continuousStats.startedAt,
      totalGenerated: continuousStats.totalGenerated
    }
  });
});

export default router;
