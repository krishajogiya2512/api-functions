import { createApp } from './app.js';

const PORT = process.env.PORT || 3000;
const app = createApp();

app.set('port', PORT);

const server = app.listen(PORT, async () => {
  console.log(`\n======================================================`);
  console.log(` ⚡ ApiPulse Studio is running on http://localhost:${PORT}`);
  console.log(` 📊 Observability Dashboard: http://localhost:${PORT}`);
  console.log(` 📈 Monitoring Stats:        http://localhost:${PORT}/api/monitor/stats`);
  console.log(` 🔍 Endpoints Analytics:     http://localhost:${PORT}/api/monitor/endpoints`);
  console.log(` 📡 Real-time SSE Stream:    http://localhost:${PORT}/api/monitor/stream`);
  console.log(` 🚀 Powered by npm package:   @krisha_2512/apipulse`);
  console.log(`======================================================\n`);

  // Seed a handful of initial diverse requests so metrics and charts look vibrant immediately
  try {
    const seedUrls = [
      { path: '/api/v1/products', method: 'GET' },
      { path: '/api/v1/products/prod_101', method: 'GET' },
      { path: '/api/v1/products/prod_102', method: 'GET' },
      { path: '/api/v1/users/usr_001/profile', method: 'GET' },
      { path: '/api/v1/orders/checkout', method: 'POST', body: JSON.stringify({ items: [{ productId: 'prod_101', quantity: 1 }] }) },
      { path: '/api/v1/analytics/report', method: 'GET' }, // triggers slow request alert
      { path: '/api/v1/legacy/catalog', method: 'GET' } // triggers 404
    ];

    for (const item of seedUrls) {
      await fetch(`http://127.0.0.1:${PORT}${item.path}`, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.body
      }).catch(() => {});
    }
    console.log(`[Seed] Initial demonstration traffic successfully recorded by @krisha_2512/apipulse\n`);
  } catch {
    // Non-fatal if seed fetch fails during startup
  }
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
