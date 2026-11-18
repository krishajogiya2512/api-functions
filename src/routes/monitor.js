import { Router } from 'express';
import {
  monitor,
  getRecentAlerts,
  clearAlerts,
  handleSSEConnection,
  broadcastSSE
} from '../monitor.js';

const router = Router();

/**
 * GET /api/monitor/stats
 * Full ApiPulse statistics snapshot
 */
router.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: monitor.getStats()
  });
});

/**
 * GET /api/monitor/endpoints
 * Granular per-endpoint analytics from ApiPulse
 */
router.get('/endpoints', (req, res) => {
  res.json({
    success: true,
    data: monitor.getEndpointStats()
  });
});

/**
 * GET /api/monitor/alerts
 * Recent slow API requests detected by onSlowRequest callback
 */
router.get('/alerts', (req, res) => {
  res.json({
    success: true,
    count: getRecentAlerts().length,
    data: getRecentAlerts()
  });
});

/**
 * POST /api/monitor/reset
 * Reset all ApiPulse counters and clear recent alerts
 */
router.post('/reset', (req, res) => {
  monitor.resetStats();
  clearAlerts();

  broadcastSSE('reset', {
    timestamp: new Date().toISOString(),
    message: 'Statistics have been reset'
  });

  res.json({
    success: true,
    message: 'ApiPulse statistics and alert history successfully reset',
    data: monitor.getStats()
  });
});

/**
 * GET /api/monitor/stream
 * Server-Sent Events (SSE) stream for real-time live telemetry
 */
router.get('/stream', (req, res) => {
  handleSSEConnection(req, res);
});

/**
 * GET /api/monitor/export
 * Export full observability report snapshot as downloadable JSON
 */
router.get('/export', (req, res) => {
  const stats = monitor.getStats();
  const endpoints = monitor.getEndpointStats();
  const alerts = getRecentAlerts();

  const report = {
    exportedAt: new Date().toISOString(),
    package: '@krisha_2512/apipulse',
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      uptimeSeconds: Math.round(process.uptime())
    },
    summary: {
      totalRequests: stats.totalRequests,
      successRate: stats.totalRequests > 0
        ? `${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2)}%`
        : '0%',
      failureRate: `${stats.failureRate}%`,
      p50LatencyMs: stats.responseTime.p50,
      p95LatencyMs: stats.responseTime.p95,
      slowRequestsCount: stats.slowRequests
    },
    stats,
    endpoints,
    alerts
  };

  res.setHeader('Content-Disposition', 'attachment; filename="apipulse-telemetry-export.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(report, null, 2));
});

/**
 * GET /api/monitor/info
 * Package metadata and active configuration
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    package: '@krisha_2512/apipulse',
    version: '1.0.0',
    config: {
      slowThresholdMs: 400,
      maxSamples: 2000,
      maxEndpoints: 1000,
      ignoredPaths: ['/health', '/api/monitor', '/api/traffic', '/favicon.ico']
    }
  });
});

export default router;
