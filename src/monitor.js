import { createMonitor } from '@krisha_2512/apipulse';

// In-memory ring buffer for recent slow request alerts
const MAX_ALERTS = 50;
const recentAlerts = [];

// Connected SSE clients for live push updates
const sseClients = new Set();

/**
 * Broadcast an SSE event to all connected dashboard clients
 */
export function broadcastSSE(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

/**
 * Configure and instantiate ApiPulse monitoring middleware
 */
export const monitor = createMonitor({
  slowThreshold: 400, // 400ms threshold for slow API detection
  enabled: true,
  ignorePaths: [
    '/health',
    '/api/monitor',
    '/api/traffic',
    '/favicon.ico',
    '/styles.css',
    '/app.js'
  ],
  maxSamples: 2000,
  maxEndpoints: 1000,
  onSlowRequest: (details) => {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      method: details.method,
      endpoint: details.endpoint,
      statusCode: details.statusCode,
      responseTime: Math.round(details.responseTime * 100) / 100
    };

    // Add to ring buffer
    recentAlerts.unshift(alert);
    if (recentAlerts.length > MAX_ALERTS) {
      recentAlerts.pop();
    }

    // Live broadcast to open dashboards
    broadcastSSE('slow_request', alert);
  }
});

/**
 * Retrieve recent slow alerts
 */
export function getRecentAlerts() {
  return [...recentAlerts];
}

/**
 * Clear alert history
 */
export function clearAlerts() {
  recentAlerts.length = 0;
}

/**
 * Register a client for Server-Sent Events (SSE)
 */
export function handleSSEConnection(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive'
  });

  res.write(': connected\n\n');

  // Push immediate initial stats snapshot
  const initialData = {
    stats: monitor.getStats(),
    alerts: getRecentAlerts()
  };
  res.write(`event: snapshot\ndata: ${JSON.stringify(initialData)}\n\n`);

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
}

// Background tick to broadcast stats updates to active dashboard viewers
const sseInterval = setInterval(() => {
  if (sseClients.size > 0) {
    const snapshot = {
      stats: monitor.getStats(),
      alerts: getRecentAlerts().slice(0, 5)
    };
    broadcastSSE('snapshot', snapshot);
  }
}, 1500);

// Unref timer so it does not block node from exiting
if (sseInterval.unref) {
  sseInterval.unref();
}
