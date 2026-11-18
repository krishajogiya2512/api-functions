# ⚡ ApiPulse Studio

> High-Performance Express API Observability & Telemetry Gateway powered by [`@krisha_2512/apipulse`](https://www.npmjs.com/package/@krisha_2512/apipulse).

[![npm version](https://img.shields.io/badge/npm-%40krisha__2512%2Fapipulse%20v1.0.0-cb3837.svg)](https://www.npmjs.com/package/@krisha_2512/apipulse)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-11%20passing-success.svg)]()

---

## 🌟 Overview

**ApiPulse Studio** is a full-featured, production-grade demonstration project built to showcase the capabilities of [`@krisha_2512/apipulse`](https://www.npmjs.com/package/@krisha_2512/apipulse) — a lightweight, zero-dependency Express.js API monitoring middleware.

It pairs a realistic E-Commerce & SaaS microservice backend with a real-time dark-mode developer telemetry dashboard, a built-in traffic & chaos simulator, and automated test coverage.

---

## ✨ Key Features Showcased

- **Zero-Config Monitoring**: Intercepts and records request latencies, status codes, and HTTP verbs without altering response bodies or interfering with Express routing.
- **Percentile Telemetry (P50 & P95)**: Real-time calculation of median and SLA tail latencies using a bounded sample buffer (`maxSamples: 2000`).
- **Slow Request Detection & Live Alerts**: Detects queries exceeding the threshold (`slowThreshold: 400ms`) via `onSlowRequest` and pushes live alerts to dashboards over Server-Sent Events (SSE).
- **Route-Pattern Grouping**: Automatically maps requests like `/api/v1/products/prod_101` and `/api/v1/products/prod_102` to `GET /api/v1/products/:id`, preventing unbounded memory growth.
- **Path Exclusion (`ignorePaths`)**: Excludes health checks (`/health`), monitoring APIs (`/api/monitor`), and static assets so telemetry reflects only customer traffic.
- **Real-Time Live Dashboard**:
  - **Latency Spectrum**: Interactive visual gauge displaying Min, P50, Average, P95, and Max.
  - **Live Distribution Charts**: Status code breakdown (2xx, 4xx, 5xx) and HTTP method distribution via Chart.js.
  - **Endpoint Telemetry Matrix**: Filterable table showing calls, latencies, error counts, and health status per route with a 1-click test button.
  - **Built-in Chaos & Traffic Simulator**: Instant buttons to trigger normal traffic surges, slow spikes, error storms, or continuous background traffic.
  - **Interactive API Tester**: Send custom requests directly from the browser to inspect response time, status, and payload.
  - **One-Click Diagnostic Export**: Download full telemetry snapshots as JSON.

---

## 🏗️ Architecture

```
api-functions/
├── package.json                 # Project configuration & npm scripts
├── README.md                    # Documentation & guide
├── src/
│   ├── app.js                   # Express application setup & middleware registration
│   ├── server.js                # Server entry point & startup demonstration seeder
│   ├── monitor.js               # ApiPulse configuration, SSE stream & alert buffer
│   ├── data/
│   │   └── mockData.js          # Mock product, user, and order datasets
│   └── routes/
│       ├── api.js               # Realistic SaaS & E-commerce API routes
│       ├── monitor.js           # Endpoints exposing ApiPulse stats, SSE & export
│       └── traffic.js           # Traffic simulation engine (surge, slow, errors)
├── public/
│   ├── index.html               # Telemetry Dashboard UI
│   ├── styles.css               # Bespoke Dark Mode Observability design system
│   ├── app.js                   # Frontend SSE listener, charts & controls
│   └── favicon.svg              # Glowing EKG pulse icon
├── scripts/
│   └── generate-traffic.js      # Standalone CLI load testing & traffic generator
└── test/
    └── monitor.test.js          # Automated test suite using Node.js test runner
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher (Node 20+ recommended)
- **npm**: `v9.0.0` or higher

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Server
```bash
npm start
```
The server will start on `http://localhost:3000` with initial demonstration traffic pre-seeded.

Open your browser to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Testing

Run the automated test suite powered by Node's native test runner (`node:test`):

```bash
npm test
```

### Test Coverage Highlights:
- ✅ Verification that `/health` is excluded from tracking via `ignorePaths`.
- ✅ Standard API requests correctly increment counters and method maps.
- ✅ Route pattern grouping (`GET /api/v1/products/:id`) across dynamic parameters.
- ✅ 400 Bad Request validation errors correctly tracked under `clientErrors`.
- ✅ 404 Not Found requests counted as failed requests.
- ✅ Slow requests (> 400ms) captured by `slowRequests` and `onSlowRequest`.
- ✅ Reset functionality (`monitor.resetStats()`) cleanly zeroes all metrics.

---

## 🚦 Traffic Generation

### From the Web Dashboard
Use the simulator buttons in the top bar:
- **⚡ Normal Surge (20)**: Fires 20 rapid requests to catalog and profile endpoints (~15–35ms).
- **🐢 Slow Spike (8)**: Fires heavy analytics and checkout calls exceeding 400ms to test P95 latency and alert triggers.
- **🚨 Error Storm (12)**: Triggers 400, 401, 404, 500, and 503 errors to test failure rate metrics.
- **🌪 Mixed Chaos (30)**: A balanced mix of all scenarios.
- **▶ Continuous Traffic Toggle**: Runs sustained background traffic at ~2 req/s.

### From the Command Line
You can also generate synthetic traffic from your terminal:

```bash
# Generate 50 requests with concurrency of 5
npm run traffic

# Custom volume and concurrency (e.g. 100 requests, 10 workers)
node scripts/generate-traffic.js 100 10
```

---

## 🔌 API Reference

### Monitored Endpoints

| Method | Endpoint | Latency Profile | Description |
|--------|----------|-----------------|-------------|
| `GET` | `/api/v1/products` | Fast (~15–35ms) | Product catalog with search and category filters |
| `GET` | `/api/v1/products/:id` | Fast (~10–25ms) | Product details by ID (returns 404 if not found) |
| `POST` | `/api/v1/products` | Fast (~25–50ms) | Create product (400 validation error if missing fields) |
| `PUT` | `/api/v1/products/:id` | Fast (~20–40ms) | Update existing product |
| `DELETE` | `/api/v1/products/:id` | Fast (~15–30ms) | Remove product |
| `GET` | `/api/v1/users/:id/profile` | Fast (~15–35ms) | User profile details |
| `POST` | `/api/v1/auth/login` | Moderate (~40–70ms) | Login (200 with JWT simulation; 401 for bad passwords) |
| `POST` | `/api/v1/orders/checkout` | Moderate (~120–220ms) | E-commerce checkout simulation |
| `GET` | `/api/v1/analytics/report` | **Slow (~450–700ms)** | Heavy aggregation query designed to trigger slow alerts |
| `POST` | `/api/v1/billing/charge` | Moderate (~90–170ms) | Billing transaction with occasional 402/500/503 failures |
| `GET` | `/api/v1/chaos/flaky` | Configurable | Flaky endpoint with configurable failure rates |
| `GET` | `/health` | **Ignored** | Service health check |

### Monitoring & Telemetry APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/monitor/stats` | Full ApiPulse metrics snapshot (`monitor.getStats()`) |
| `GET` | `/api/monitor/endpoints` | Per-endpoint granular analytics (`monitor.getEndpointStats()`) |
| `GET` | `/api/monitor/alerts` | Recent slow request alerts captured via `onSlowRequest` |
| `POST` | `/api/monitor/reset` | Resets all ApiPulse metrics and alert history |
| `GET` | `/api/monitor/stream` | Server-Sent Events (SSE) live telemetry feed |
| `GET` | `/api/monitor/export` | Download complete observability report as JSON |
| `GET` | `/api/monitor/info` | Middleware configuration and metadata |

---

## 💡 How ApiPulse is Configured

```javascript
import { createMonitor } from '@krisha_2512/apipulse';

export const monitor = createMonitor({
  slowThreshold: 400,        // 400ms threshold for slow API detection
  enabled: true,
  ignorePaths: [
    '/health',
    '/api/monitor',
    '/api/traffic',
    '/favicon.ico',
    '/styles.css',
    '/app.js'
  ],
  maxSamples: 2000,          // Sample window for P50 & P95 calculation
  maxEndpoints: 1000,        // Cap on unique endpoint keys
  onSlowRequest: (details) => {
    // details: { method, endpoint, statusCode, responseTime }
    console.warn(`[SLOW API] ${details.method} ${details.endpoint} took ${details.responseTime}ms`);
  }
});

// Register middleware before routes:
app.use(monitor.middleware);
```

---

## 📜 License

MIT © [krisha_2512](https://www.npmjs.com/~krisha_2512)
