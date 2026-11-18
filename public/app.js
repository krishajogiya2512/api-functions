// ApiPulse Studio Frontend Application Logic

// State
let statsState = null;
let endpointStats = {};
let alertsState = [];
let continuousRunning = false;
let timelineHistory = {
  labels: [],
  p50: [],
  avg: []
};

// Charts
let statusCodesChart = null;
let methodsChart = null;
let timelineChart = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  connectSSE();
  setupEventListeners();
  loadInitialData();
});

/**
 * Initialize Chart.js instances
 */
function initCharts() {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { size: 11 } }
      }
    }
  };

  // Status codes donut chart
  const ctxStatus = document.getElementById('chart-status-codes').getContext('2d');
  statusCodesChart = new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: ['2xx Success', '4xx Client', '5xx Server'],
      datasets: [{
        data: [1, 0, 0],
        backgroundColor: ['#10b981', '#f59e0b', '#f43f5e'],
        borderColor: '#0f172a',
        borderWidth: 2
      }]
    },
    options: {
      ...chartOptions,
      cutout: '70%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } }
      }
    }
  });

  // Methods bar chart
  const ctxMethods = document.getElementById('chart-methods').getContext('2d');
  methodsChart = new Chart(ctxMethods, {
    type: 'bar',
    data: {
      labels: ['GET', 'POST', 'PUT', 'DELETE'],
      datasets: [{
        label: 'Requests',
        data: [0, 0, 0, 0],
        backgroundColor: ['#06b6d4', '#10b981', '#f59e0b', '#f43f5e'],
        borderRadius: 4
      }]
    },
    options: {
      ...chartOptions,
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { display: false } },
        y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' }, beginAtZero: true }
      },
      plugins: { legend: { display: false } }
    }
  });

  // Timeline line chart
  const ctxTimeline = document.getElementById('chart-timeline').getContext('2d');
  timelineChart = new Chart(ctxTimeline, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'P50 Median',
          data: [],
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 2
        },
        {
          label: 'Average',
          data: [],
          borderColor: '#38bdf8',
          borderDash: [4, 4],
          borderWidth: 1.5,
          tension: 0.3,
          pointRadius: 0
        }
      ]
    },
    options: {
      ...chartOptions,
      scales: {
        x: { ticks: { color: '#64748b', maxTicksLimit: 6 }, grid: { display: false } },
        y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' }, beginAtZero: true }
      },
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } }
      }
    }
  });
}

/**
 * Connect to live Server-Sent Events (SSE) stream
 */
function connectSSE() {
  const pill = document.getElementById('connection-pill');
  const text = document.getElementById('connection-text');

  const evtSource = new EventSource('/api/monitor/stream');

  evtSource.onopen = () => {
    pill.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    text.textContent = 'Live SSE Connected';
  };

  evtSource.addEventListener('snapshot', (e) => {
    try {
      const payload = JSON.parse(e.data);
      if (payload.stats) updateUI(payload.stats);
      if (payload.alerts) updateAlerts(payload.alerts);
    } catch (err) {
      console.error('Error parsing snapshot:', err);
    }
  });

  evtSource.addEventListener('slow_request', (e) => {
    try {
      const alert = JSON.parse(e.data);
      prependAlert(alert);
    } catch (err) {
      console.error('Error parsing slow request alert:', err);
    }
  });

  evtSource.addEventListener('reset', () => {
    timelineHistory = { labels: [], p50: [], avg: [] };
    loadInitialData();
  });

  evtSource.onerror = () => {
    pill.style.borderColor = 'rgba(244, 63, 94, 0.4)';
    text.textContent = 'Reconnecting...';
    setTimeout(loadInitialData, 3000);
  };
}

/**
 * Fetch initial dataset on load
 */
async function loadInitialData() {
  try {
    const [statsRes, endpointsRes, alertsRes] = await Promise.all([
      fetch('/api/monitor/stats').then((r) => r.json()),
      fetch('/api/monitor/endpoints').then((r) => r.json()),
      fetch('/api/monitor/alerts').then((r) => r.json())
    ]);

    if (statsRes.success) updateUI(statsRes.data);
    if (endpointsRes.success) {
      endpointStats = endpointsRes.data;
      renderEndpointsTable(endpointsRes.data);
    }
    if (alertsRes.success) updateAlerts(alertsRes.data);

    // Check continuous simulator status
    const statusRes = await fetch('/api/traffic/continuous/status').then((r) => r.json());
    if (statusRes.status?.running) {
      continuousRunning = true;
      document.getElementById('btn-toggle-continuous').innerHTML = '<span>⏸ Continuous Traffic: ON</span>';
      document.getElementById('btn-toggle-continuous').classList.add('btn-amber');
    }
  } catch (err) {
    console.error('Failed to load initial data:', err);
  }
}

/**
 * Update UI with fresh stats snapshot
 */
function updateUI(stats) {
  statsState = stats;

  // Latency spectrum values
  const avg = stats.responseTime?.average || 0;
  const min = stats.responseTime?.min || 0;
  const max = stats.responseTime?.max || 0;
  const p50 = stats.responseTime?.p50 || 0;
  const p95 = stats.responseTime?.p95 || 0;

  document.getElementById('stat-avg-latency').textContent = `${avg.toFixed(1)} ms`;
  document.getElementById('stat-min-latency').textContent = `${min.toFixed(1)} ms`;
  document.getElementById('stat-max-latency').textContent = `${max.toFixed(1)} ms`;
  document.getElementById('stat-p50-latency').textContent = `${p50.toFixed(1)} ms`;
  document.getElementById('stat-p95-latency').textContent = `${p95.toFixed(1)} ms`;

  // Update marker positions on latency bar
  const referenceMax = Math.max(max, 500, p95 * 1.2);
  const p50Percent = Math.min(Math.max((p50 / referenceMax) * 100, 5), 85);
  const p95Percent = Math.min(Math.max((p95 / referenceMax) * 100, 15), 95);

  document.getElementById('marker-p50').style.left = `${p50Percent}%`;
  document.getElementById('val-marker-p50').textContent = `${p50.toFixed(0)}ms`;

  document.getElementById('marker-p95').style.left = `${p95Percent}%`;
  document.getElementById('val-marker-p95').textContent = `${p95.toFixed(0)}ms`;

  // KPIs
  const total = stats.totalRequests || 0;
  document.getElementById('kpi-total-requests').textContent = total.toLocaleString();

  const successCount = stats.successfulRequests || 0;
  const failedCount = stats.failedRequests || 0;
  const successPct = total > 0 ? ((successCount / total) * 100).toFixed(1) : '100.0';
  document.getElementById('kpi-success-rate').textContent = `${successPct}%`;
  document.getElementById('kpi-success-count').textContent = `${successCount.toLocaleString()} successful requests`;

  document.getElementById('kpi-failure-rate').textContent = `${stats.failureRate || 0}%`;
  document.getElementById('kpi-error-breakdown').textContent = `${stats.clientErrors || 0} client (4xx) · ${stats.serverErrors || 0} server (5xx)`;

  const slowCount = stats.slowRequests || 0;
  document.getElementById('kpi-slow-count').textContent = slowCount.toLocaleString();
  const slowPct = total > 0 ? ((slowCount / total) * 100).toFixed(1) : '0.0';
  document.getElementById('kpi-slow-pct').textContent = `${slowPct}% of total traffic`;

  const endpointKeys = Object.keys(stats.endpoints || {});
  document.getElementById('kpi-endpoints-count').textContent = endpointKeys.length;

  // Update Charts
  updateCharts(stats);

  // Update Endpoints Table
  if (stats.endpoints) {
    endpointStats = stats.endpoints;
    renderEndpointsTable(stats.endpoints);
  }
}

/**
 * Update charts with latest distributions
 */
function updateCharts(stats) {
  // Status codes donut
  const statusCodes = stats.statusCodes || {};
  let success2xx = 0;
  let client4xx = 0;
  let server5xx = 0;

  for (const [codeStr, count] of Object.entries(statusCodes)) {
    const code = parseInt(codeStr, 10);
    if (code >= 200 && code < 400) success2xx += count;
    else if (code >= 400 && code < 500) client4xx += count;
    else if (code >= 500) server5xx += count;
  }

  if (statusCodesChart) {
    statusCodesChart.data.datasets[0].data = [
      Math.max(success2xx, 0),
      Math.max(client4xx, 0),
      Math.max(server5xx, 0)
    ];
    statusCodesChart.update('none');
  }

  // Methods bar
  const methods = stats.methods || {};
  if (methodsChart) {
    methodsChart.data.datasets[0].data = [
      methods.GET || 0,
      methods.POST || 0,
      methods.PUT || 0,
      methods.DELETE || 0
    ];
    methodsChart.update('none');
  }

  // Timeline line chart
  const now = new Date().toLocaleTimeString();
  timelineHistory.labels.push(now);
  timelineHistory.p50.push(stats.responseTime?.p50 || 0);
  timelineHistory.avg.push(stats.responseTime?.average || 0);

  if (timelineHistory.labels.length > 20) {
    timelineHistory.labels.shift();
    timelineHistory.p50.shift();
    timelineHistory.avg.shift();
  }

  if (timelineChart) {
    timelineChart.data.labels = timelineHistory.labels;
    timelineChart.data.datasets[0].data = timelineHistory.p50;
    timelineChart.data.datasets[1].data = timelineHistory.avg;
    timelineChart.update('none');
  }
}

/**
 * Render endpoint table
 */
function renderEndpointsTable(endpoints) {
  const tbody = document.getElementById('endpoints-tbody');
  const filter = (document.getElementById('endpoint-search').value || '').toLowerCase();

  const entries = Object.entries(endpoints || {});

  if (entries.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          No endpoints recorded yet.
        </td>
      </tr>
    `;
    return;
  }

  const filtered = entries.filter(([key]) => key.toLowerCase().includes(filter));

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          No endpoints match filter "${filter}".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(([key, data]) => {
    const parts = key.split(' ');
    const method = parts[0] || 'GET';
    const route = parts.slice(1).join(' ') || key;

    let badgeClass = 'badge-get';
    if (method === 'POST') badgeClass = 'badge-post';
    else if (method === 'PUT') badgeClass = 'badge-put';
    else if (method === 'DELETE') badgeClass = 'badge-delete';

    // Health pill determination
    const failRate = data.requests > 0 ? (data.failed / data.requests) * 100 : 0;
    const slowRate = data.requests > 0 ? (data.slow / data.requests) * 100 : 0;

    let healthClass = 'health-healthy';
    let healthLabel = 'Healthy';
    if (failRate > 20 || slowRate > 30) {
      healthClass = 'health-critical';
      healthLabel = 'Degraded';
    } else if (failRate > 0 || slowRate > 0) {
      healthClass = 'health-degraded';
      healthLabel = 'Warning';
    }

    const avgMs = data.averageResponseTime ? data.averageResponseTime.toFixed(1) : '0.0';
    const minMs = data.min ? data.min.toFixed(1) : '0.0';
    const maxMs = data.max ? data.max.toFixed(1) : '0.0';

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge ${badgeClass}">${method}</span>
            <code style="color: var(--text-primary); font-size: 0.82rem;">${escapeHtml(route)}</code>
          </div>
        </td>
        <td class="tabular-nums" style="font-weight: 600;">${data.requests.toLocaleString()}</td>
        <td class="tabular-nums">${avgMs} ms</td>
        <td class="tabular-nums" style="color: var(--text-secondary);">${minMs} / ${maxMs} ms</td>
        <td class="tabular-nums" style="${data.slow > 0 ? 'color: var(--accent-amber); font-weight: 600;' : ''}">${data.slow}</td>
        <td class="tabular-nums" style="${data.failed > 0 ? 'color: var(--accent-rose); font-weight: 600;' : ''}">${data.failed}</td>
        <td><span class="health-pill ${healthClass}">${healthLabel}</span></td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm test-route-btn" data-method="${method}" data-route="${escapeHtml(route)}">
            Test
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Add event listener to each row's test button
  tbody.querySelectorAll('.test-route-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const method = btn.getAttribute('data-method');
      let route = btn.getAttribute('data-route');

      // Replace route pattern params (e.g. :id with prod_101)
      route = route.replace(':id', 'prod_101');

      document.getElementById('test-method').value = method;
      document.getElementById('test-path').value = route;

      const bodyGroup = document.getElementById('body-group');
      if (method === 'POST' || method === 'PUT') {
        bodyGroup.style.display = 'block';
        if (route.includes('checkout')) {
          document.getElementById('test-body').value = JSON.stringify({ items: [{ productId: 'prod_101', quantity: 1 }] }, null, 2);
        } else if (route.includes('products')) {
          document.getElementById('test-body').value = JSON.stringify({ name: 'Pulse Test Node', price: 89.99 }, null, 2);
        }
      } else {
        bodyGroup.style.display = 'none';
      }

      // Trigger test
      executeInteractiveTest();
    });
  });
}

/**
 * Update alerts feed
 */
function updateAlerts(alerts) {
  alertsState = alerts || [];
  document.getElementById('alerts-count-badge').textContent = `${alertsState.length} alerts`;
  renderAlerts();
}

function prependAlert(alert) {
  alertsState.unshift(alert);
  if (alertsState.length > 50) alertsState.pop();
  document.getElementById('alerts-count-badge').textContent = `${alertsState.length} alerts`;
  renderAlerts();
}

function renderAlerts() {
  const container = document.getElementById('alerts-list');
  if (alertsState.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 2rem; font-size: 0.82rem;">
        No slow requests detected yet. Run the "Slow Spike" simulator to trigger alerts!
      </div>
    `;
    return;
  }

  container.innerHTML = alertsState.slice(0, 15).map((a) => {
    const timeStr = new Date(a.timestamp).toLocaleTimeString();
    return `
      <div class="alert-item">
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <span class="badge badge-get" style="font-size: 0.65rem;">${a.method}</span>
          <code style="font-size: 0.8rem; color: #f8fafc;">${escapeHtml(a.endpoint)}</code>
          <span style="font-size: 0.72rem; color: var(--text-muted);">HTTP ${a.statusCode}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="tabular-nums" style="color: var(--accent-amber); font-weight: 700; font-size: 0.82rem;">
            ${a.responseTime} ms
          </span>
          <span class="alert-item-time">${timeStr}</span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Search endpoint filter
  document.getElementById('endpoint-search').addEventListener('input', () => {
    renderEndpointsTable(endpointStats);
  });

  // Traffic simulation presets
  document.getElementById('btn-sim-surge').addEventListener('click', () => runSimulation('traffic-surge', 20));
  document.getElementById('btn-sim-slow').addEventListener('click', () => runSimulation('slow-spike', 8));
  document.getElementById('btn-sim-error').addEventListener('click', () => runSimulation('error-storm', 12));
  document.getElementById('btn-sim-chaos').addEventListener('click', () => runSimulation('mixed-chaos', 30));

  // Continuous traffic toggle
  document.getElementById('btn-toggle-continuous').addEventListener('click', toggleContinuousTraffic);

  // Reset stats
  document.getElementById('btn-reset-stats').addEventListener('click', resetStats);

  // Export JSON
  document.getElementById('btn-export-json').addEventListener('click', () => {
    window.location.href = '/api/monitor/export';
  });

  // Method selector changes body visibility
  document.getElementById('test-method').addEventListener('change', (e) => {
    const method = e.target.value;
    document.getElementById('body-group').style.display = (method === 'POST' || method === 'PUT') ? 'block' : 'none';
  });

  // Interactive tester send
  document.getElementById('btn-send-test').addEventListener('click', executeInteractiveTest);

  // Preset buttons for tester
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const method = btn.getAttribute('data-method');
      const path = btn.getAttribute('data-path');
      const body = btn.getAttribute('data-body');

      document.getElementById('test-method').value = method;
      document.getElementById('test-path').value = path;

      const bodyGroup = document.getElementById('body-group');
      if (body) {
        bodyGroup.style.display = 'block';
        document.getElementById('test-body').value = body;
      } else {
        bodyGroup.style.display = (method === 'POST' || method === 'PUT') ? 'block' : 'none';
      }
    });
  });
}

/**
 * Execute traffic simulation
 */
async function runSimulation(preset, count) {
  try {
    const res = await fetch('/api/traffic/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset, count })
    });
    const data = await res.json();
    if (data.success) {
      loadInitialData();
    }
  } catch (err) {
    console.error('Simulation error:', err);
  }
}

/**
 * Toggle continuous background traffic
 */
async function toggleContinuousTraffic() {
  const btn = document.getElementById('btn-toggle-continuous');
  try {
    if (continuousRunning) {
      await fetch('/api/traffic/continuous/stop', { method: 'POST' });
      continuousRunning = false;
      btn.innerHTML = '<span>▶ Continuous Traffic: OFF</span>';
      btn.classList.remove('btn-amber');
    } else {
      await fetch('/api/traffic/continuous/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: 2 })
      });
      continuousRunning = true;
      btn.innerHTML = '<span>⏸ Continuous Traffic: ON</span>';
      btn.classList.add('btn-amber');
    }
  } catch (err) {
    console.error('Failed to toggle continuous traffic:', err);
  }
}

/**
 * Reset statistics
 */
async function resetStats() {
  if (!confirm('Are you sure you want to reset all ApiPulse metrics and alerts?')) return;
  try {
    const res = await fetch('/api/monitor/reset', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      updateUI(data.data);
      updateAlerts([]);
      timelineHistory = { labels: [], p50: [], avg: [] };
      if (timelineChart) {
        timelineChart.data.labels = [];
        timelineChart.data.datasets[0].data = [];
        timelineChart.data.datasets[1].data = [];
        timelineChart.update();
      }
    }
  } catch (err) {
    console.error('Failed to reset stats:', err);
  }
}

/**
 * Interactive API Tester execution
 */
async function executeInteractiveTest() {
  const method = document.getElementById('test-method').value;
  const path = document.getElementById('test-path').value;
  const bodyText = document.getElementById('test-body').value;
  const metaEl = document.getElementById('test-response-meta');
  const boxEl = document.getElementById('test-response-box');

  metaEl.innerHTML = '<span style="color: var(--text-muted);">Sending...</span>';
  boxEl.textContent = 'Awaiting response...';

  const startTime = performance.now();
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if ((method === 'POST' || method === 'PUT') && bodyText.trim()) {
      options.body = bodyText;
    }

    const res = await fetch(path, options);
    const duration = Math.round(performance.now() - startTime);

    const contentType = res.headers.get('content-type') || '';
    let responseBody;
    if (contentType.includes('application/json')) {
      const json = await res.json();
      responseBody = JSON.stringify(json, null, 2);
    } else {
      responseBody = await res.text();
    }

    const statusColor = res.status >= 200 && res.status < 400 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
    metaEl.innerHTML = `
      <span style="color: ${statusColor}; font-weight: 700;">HTTP ${res.status} ${res.statusText}</span> · 
      <span class="tabular-nums" style="color: var(--text-primary); font-weight: 600;">${duration} ms</span>
    `;
    boxEl.textContent = responseBody;

    // Refresh telemetry immediately
    loadInitialData();
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    metaEl.innerHTML = `<span style="color: var(--accent-rose);">Network Error</span> · ${duration} ms`;
    boxEl.textContent = `Error: ${err.message}`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
