/**
 * Mock database and seed data for the API Pulse Studio demo application.
 */

export const products = [
  { id: 'prod_101', name: 'UltraSync Edge Gateway', category: 'Hardware', price: 299.99, stock: 45, rating: 4.8 },
  { id: 'prod_102', name: 'PulseVector Vector DB Pro', category: 'Cloud Tools', price: 99.00, stock: 999, rating: 4.9 },
  { id: 'prod_103', name: 'AeroFiber High-Gain Antenna', category: 'Hardware', price: 149.50, stock: 12, rating: 4.6 },
  { id: 'prod_104', name: 'TelemetryStreamer Agent', category: 'Observability', price: 49.00, stock: 850, rating: 4.7 },
  { id: 'prod_105', name: 'DataGrid Realtime Pipeline', category: 'Analytics', price: 199.00, stock: 320, rating: 4.5 },
  { id: 'prod_106', name: 'EdgeProxy SSL Accelerator', category: 'Security', price: 129.99, stock: 80, rating: 4.8 }
];

export const users = [
  { id: 'usr_001', username: 'alex.rivera', email: 'alex@example.com', role: 'DevOps Lead', tier: 'Enterprise' },
  { id: 'usr_002', username: 'priya.sharma', email: 'priya@example.com', role: 'Solutions Architect', tier: 'Pro' },
  { id: 'usr_003', username: 'marcus.vance', email: 'marcus@example.com', role: 'Site Reliability Engineer', tier: 'Team' }
];

export const orders = [
  { id: 'ord_901', userId: 'usr_001', items: [{ productId: 'prod_101', quantity: 2 }], total: 599.98, status: 'completed', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'ord_902', userId: 'usr_002', items: [{ productId: 'prod_102', quantity: 1 }], total: 99.00, status: 'completed', createdAt: new Date(Date.now() - 7200000).toISOString() }
];
