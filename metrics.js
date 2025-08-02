import promClient from 'prom-client';

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'valvechain-sidecar-api'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Create custom metrics
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const blockchainOperationsTotal = new promClient.Counter({
  name: 'blockchain_operations_total',
  help: 'Total number of blockchain operations',
  labelNames: ['operation', 'status'],
  registers: [register]
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register]
});

// Middleware to collect HTTP metrics
export const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = (Date.now() - startTime) / 1000; // Convert to seconds
    const route = req.route?.path || req.path || 'unknown';
    
    // Record metrics
    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode
    });
    
    httpRequestDuration.observe({
      method: req.method,
      route: route,
      status_code: res.statusCode
    }, responseTime);
    
    // Call original end method
    originalEnd.apply(this, args);
  };
  
  next();
};

// Function to record blockchain operations
export const recordBlockchainOperation = (operation, status) => {
  blockchainOperationsTotal.inc({ operation, status });
};

// Function to update active connections
export const updateActiveConnections = (count) => {
  activeConnections.set(count);
};

export { register };