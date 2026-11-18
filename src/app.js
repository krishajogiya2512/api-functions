import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { monitor } from './monitor.js';
import apiRoutes from './routes/api.js';
import monitorRoutes from './routes/monitor.js';
import trafficRoutes from './routes/traffic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../public');

export function createApp() {
  const app = express();

  // Basic middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Register ApiPulse monitoring middleware
  // This will intercept all incoming requests, tracking latency, status codes,
  // error rates, percentiles (p50, p95), and route pattern grouping
  app.use(monitor.middleware);

  // Serve static UI assets
  app.use(express.static(publicDir));

  // Health check endpoint (ignored in ApiPulse config)
  app.get('/health', (req, res) => {
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      package: '@krisha_2512/apipulse'
    });
  });

  // Mount API routers
  app.use(apiRoutes);
  app.use('/api/monitor', monitorRoutes);
  app.use('/api/traffic', trafficRoutes);

  // Fallback 404 handler for any unmatched requests
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Route '${req.method} ${req.originalUrl}' not found`
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled request error:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal Server Error'
    });
  });

  return app;
}
