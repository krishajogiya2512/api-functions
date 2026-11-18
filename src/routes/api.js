import { Router } from 'express';
import { products, users, orders } from '../data/mockData.js';

const router = Router();

// Helper to simulate asynchronous processing delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GET /api/v1/products
 * Retrieve all products, optionally filtered by category
 */
router.get('/api/v1/products', async (req, res) => {
  await sleep(15 + Math.random() * 20); // Fast response: ~15-35ms
  const { category, search } = req.query;

  let result = [...products];
  if (category) {
    result = result.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }
  if (search) {
    result = result.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  }

  res.json({
    success: true,
    count: result.length,
    data: result
  });
});

/**
 * GET /api/v1/products/:id
 * Retrieve a specific product by ID
 */
router.get('/api/v1/products/:id', async (req, res) => {
  await sleep(10 + Math.random() * 15);
  const product = products.find((p) => p.id === req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: `Product with ID '${req.params.id}' was not found`
    });
  }

  res.json({
    success: true,
    data: product
  });
});

/**
 * POST /api/v1/products
 * Add a new product to the catalog
 */
router.post('/api/v1/products', async (req, res) => {
  await sleep(25 + Math.random() * 25);
  const { name, category, price, stock } = req.body || {};

  if (!name || price === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed: name and price are required fields'
    });
  }

  const newProduct = {
    id: `prod_${Date.now().toString().slice(-4)}`,
    name,
    category: category || 'General',
    price: Number(price),
    stock: Number(stock || 10),
    rating: 5.0
  };

  products.push(newProduct);
  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: newProduct
  });
});

/**
 * PUT /api/v1/products/:id
 * Update an existing product
 */
router.put('/api/v1/products/:id', async (req, res) => {
  await sleep(20 + Math.random() * 20);
  const index = products.findIndex((p) => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: `Product '${req.params.id}' not found for update`
    });
  }

  products[index] = { ...products[index], ...req.body };
  res.json({
    success: true,
    message: 'Product updated successfully',
    data: products[index]
  });
});

/**
 * DELETE /api/v1/products/:id
 * Delete a product
 */
router.delete('/api/v1/products/:id', async (req, res) => {
  await sleep(15 + Math.random() * 15);
  const index = products.findIndex((p) => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: `Product '${req.params.id}' not found`
    });
  }

  const removed = products.splice(index, 1)[0];
  res.json({
    success: true,
    message: 'Product deleted',
    data: removed
  });
});

/**
 * GET /api/v1/users/:id/profile
 * Retrieve user profile
 */
router.get('/api/v1/users/:id/profile', async (req, res) => {
  await sleep(15 + Math.random() * 20);
  const user = users.find((u) => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: `User '${req.params.id}' not found`
    });
  }

  res.json({
    success: true,
    data: user
  });
});

/**
 * POST /api/v1/auth/login
 * User login endpoint
 */
router.post('/api/v1/auth/login', async (req, res) => {
  await sleep(40 + Math.random() * 30);
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required'
    });
  }

  if (password === 'secret' || password === 'admin' || password === 'pulse123') {
    return res.json({
      success: true,
      token: `pulse_jwt_${Math.random().toString(36).substring(2)}`,
      user: { username, role: 'admin' }
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid credentials. Try password: secret'
  });
});

/**
 * POST /api/v1/orders/checkout
 * E-commerce checkout simulation with moderate latency
 */
router.post('/api/v1/orders/checkout', async (req, res) => {
  // Moderate latency simulating external payment gateway
  await sleep(120 + Math.random() * 100);

  const { items, customerId } = req.body || {};

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Cart is empty. Provide an array of items.'
    });
  }

  const total = items.reduce((sum, item) => sum + (item.price || 50) * (item.quantity || 1), 0);
  const newOrder = {
    id: `ord_${Date.now().toString().slice(-4)}`,
    userId: customerId || 'usr_guest',
    items,
    total: Math.round(total * 100) / 100,
    status: 'completed',
    createdAt: new Date().toISOString()
  };

  orders.push(newOrder);

  res.status(201).json({
    success: true,
    message: 'Checkout completed successfully',
    data: newOrder
  });
});

/**
 * GET /api/v1/analytics/report
 * Heavy reporting query deliberately taking > 400ms to trigger ApiPulse slow threshold!
 */
router.get('/api/v1/analytics/report', async (req, res) => {
  // Simulate heavy database aggregation / compute
  const delay = 450 + Math.random() * 250; // 450ms - 700ms (exceeds slowThreshold: 400ms)
  await sleep(delay);

  res.json({
    success: true,
    executionTimeMs: Math.round(delay),
    report: {
      generatedAt: new Date().toISOString(),
      activeTenants: 124,
      totalThroughputMb: 4892.4,
      p99EfficiencyScore: 98.4,
      aggregates: {
        dailyActiveUsers: 14200,
        retentionRate: '87.4%',
        avgSessionDurationSec: 342
      }
    }
  });
});

/**
 * POST /api/v1/billing/charge
 * Simulates third-party credit card gateway with occasional errors
 */
router.post('/api/v1/billing/charge', async (req, res) => {
  await sleep(90 + Math.random() * 80);

  const { amount, currency, simulateFailure } = req.body || {};

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid charge amount'
    });
  }

  // If explicit failure requested or random 25% failure
  const fail = simulateFailure === true || req.query.fail === 'true' || Math.random() < 0.25;

  if (fail) {
    const errorTypes = [
      { status: 402, message: 'Card declined: Insufficient funds' },
      { status: 503, message: 'Payment gateway service temporarily unavailable' },
      { status: 500, message: 'Internal bank settlement exception' }
    ];
    const picked = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    return res.status(picked.status).json({
      success: false,
      error: picked.message
    });
  }

  res.json({
    success: true,
    transactionId: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    amount,
    currency: currency || 'USD',
    status: 'settled'
  });
});

/**
 * GET /api/v1/chaos/flaky
 * Configurable flaky endpoint for testing error distribution & resilience
 */
router.get('/api/v1/chaos/flaky', async (req, res) => {
  const failureRate = parseFloat(req.query.rate || '0.5');
  const baseDelay = parseInt(req.query.delay || '50', 10);

  await sleep(baseDelay + Math.random() * 50);

  if (Math.random() < failureRate) {
    const statusCodes = [500, 502, 503, 504];
    const code = statusCodes[Math.floor(Math.random() * statusCodes.length)];
    return res.status(code).json({
      success: false,
      error: `Simulated chaos error ${code}`,
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    message: 'Chaos test passed successfully',
    chaosRateTested: failureRate
  });
});

export default router;
