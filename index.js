const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// Route imports
const userRoutes = require('./userRoutes');
const auditLogsRoute = require('./auditLogsRoute');
const manufacturerRoutes = require('./manufacturerRoutes');
const distributorRoutes = require('./distributorRoutes');
const blockchainService = require('./blockchainService');

// Middleware imports
const advancedRateLimit = require('./middleware/advancedRateLimit');
const circuitBreaker = require('./middleware/circuitBreaker');
const monitoring = require('./middleware/monitoring');
const config = require('./config/scalingConfig');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Compression middleware
app.use(compression());

// Request logging (only in development)
if (config.monitoring.performance.enableRequestLogging) {
  app.use(morgan('combined'));
}

// Monitoring middleware (must be early in the chain)
app.use(monitoring.requestTracker());

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
if (config.features.advancedRateLimiting) {
  app.use(advancedRateLimit.globalLimiter());
  app.use(advancedRateLimit.slowDown());
}

// Circuit breaker middleware
if (config.features.circuitBreakers) {
  app.use(circuitBreaker.databaseBreaker());
  app.use(circuitBreaker.blockchainBreaker());
  app.use(circuitBreaker.emailBreaker());
}

// Initialize blockchain service
blockchainService.initialize();

// Health check endpoint (enhanced)
app.get('/api/health', (req, res) => {
  const health = monitoring.healthCheck();
  const circuitBreakerHealth = circuitBreaker.healthCheck();
  
  const combinedHealth = {
    ...health,
    circuitBreakers: circuitBreakerHealth.breakers,
    features: {
      advancedRateLimiting: config.features.advancedRateLimiting,
      circuitBreakers: config.features.circuitBreakers,
      metricsCollection: config.features.metricsCollection,
    },
    version: '1.0.0',
    environment: config.environment,
  };
  
  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json(combinedHealth);
});

// Metrics endpoint (Prometheus format)
app.get('/metrics', async (req, res) => {
  if (!config.monitoring.metrics.enabled) {
    return res.status(404).json({ error: 'Metrics collection disabled' });
  }
  
  try {
    const metrics = await monitoring.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Autoscaling metrics endpoint
app.get('/api/autoscaling/metrics', (req, res) => {
  const metrics = monitoring.getAutoscalingMetrics();
  res.json(metrics);
});

// Rate limiting stats endpoint
app.get('/api/rate-limit/stats', (req, res) => {
  const stats = advancedRateLimit.getStats();
  res.json(stats);
});

// Circuit breaker stats endpoint
app.get('/api/circuit-breaker/stats', (req, res) => {
  const stats = circuitBreaker.getStats();
  res.json(stats);
});

// Add user management routes with enhanced rate limiting
app.use('/api/auth', 
  config.features.advancedRateLimiting ? advancedRateLimit.authLimiter() : (req, res, next) => next(),
  userRoutes
);

// Add audit logs route
app.use('/api', auditLogsRoute);

// Add manufacturer and valve tokenization routes with tiered rate limiting
app.use('/api', 
  config.features.advancedRateLimiting ? advancedRateLimit.tieredLimiter() : (req, res, next) => next(),
  manufacturerRoutes
);

// Add distributor management routes with tiered rate limiting
app.use('/api', 
  config.features.advancedRateLimiting ? advancedRateLimit.tieredLimiter() : (req, res, next) => next(),
  distributorRoutes
);

// Placeholder ValveChain endpoints (blockchain integration disabled for now)
app.post('/api/register-valve', async (req, res) => {
  res.json({ message: 'ValveChain integration temporarily disabled. User management is active.' });
});

app.post('/api/transfer-valve', async (req, res) => {
  res.json({ message: 'ValveChain integration temporarily disabled. User management is active.' });
});

app.post('/api/maintenance', async (req, res) => {
  res.json({ message: 'ValveChain integration temporarily disabled. User management is active.' });
});

app.post('/api/repair-request', async (req, res) => {
  res.json({ message: 'ValveChain integration temporarily disabled. User management is active.' });
});

app.post('/api/repair', async (req, res) => {
  res.json({ message: 'ValveChain integration temporarily disabled. User management is active.' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  // Track circuit breaker failures
  if (error.name === 'CircuitBreakerOpenError') {
    monitoring.trackCircuitBreakerFailure(error.service || 'unknown');
  }
  
  // Rate limit error tracking
  if (error.status === 429) {
    monitoring.trackRateLimit('global', monitoring.getUserTier(req));
  }
  
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(config.environment === 'development' && { stack: error.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`ValveChain Sidecar API running on port ${PORT}`);
  console.log('Environment:', config.environment);
  console.log('Features enabled:');
  console.log('  - Advanced Rate Limiting:', config.features.advancedRateLimiting);
  console.log('  - Circuit Breakers:', config.features.circuitBreakers);
  console.log('  - Metrics Collection:', config.features.metricsCollection);
  console.log('  - Regional Scaling:', config.features.regionalScaling);
  console.log('');
  console.log('Available endpoints:');
  console.log('System endpoints:');
  console.log('  GET /api/health - Health check with autoscaling metrics');
  console.log('  GET /metrics - Prometheus metrics');
  console.log('  GET /api/autoscaling/metrics - Autoscaling-specific metrics');
  console.log('  GET /api/rate-limit/stats - Rate limiting statistics');
  console.log('  GET /api/circuit-breaker/stats - Circuit breaker statistics');
  console.log('');
  console.log('User management endpoints:');
  console.log('  POST /api/auth/register');
  console.log('  POST /api/auth/login');
  console.log('  POST /api/auth/test-token (development only)');
  console.log('  GET /api/auth/profile');
  console.log('  PUT /api/auth/profile');
  console.log('  PUT /api/auth/change-password');
  console.log('  GET /api/auth/users (admin only)');
  console.log('  GET /api/audit_logs (admin only)');
  console.log('');
  console.log('Manufacturer tokenization endpoints:');
  console.log('  POST /api/manufacturers/validate');
  console.log('  GET /api/manufacturers');
  console.log('  GET /api/manufacturers/:id');
  console.log('  GET /api/manufacturers/:id/valves');
  console.log('  POST /api/valves/tokenize');
  console.log('  GET /api/valves');
  console.log('  GET /api/valves/:tokenId');
  console.log('');
  console.log('Distributor management endpoints:');
  console.log('  POST /api/distributors/register');
  console.log('  GET /api/distributors');
  console.log('  GET /api/distributors/:id');
  console.log('  PUT /api/distributors/:id');
  console.log('  DELETE /api/distributors/:id');
  console.log('  POST /api/distributor-relationships/assign');
  console.log('  DELETE /api/distributor-relationships/:relationshipId/revoke');
  console.log('  GET /api/manufacturers/:manufacturerId/distributors');
  console.log('  POST /api/valves/transfer-ownership');
  console.log('  GET /api/territories');
  console.log('  GET /api/territories/type/:type');
  console.log('  GET /api/territories/:id');
  console.log('');
  console.log('Autoscaling configuration:');
  console.log('  CPU Scale Up Threshold:', config.autoscaling.cpu.scaleUpThreshold + '%');
  console.log('  CPU Scale Down Threshold:', config.autoscaling.cpu.scaleDownThreshold + '%');
  console.log('  RPS Scale Up Threshold:', config.autoscaling.rps.scaleUpThreshold);
  console.log('  RPS Scale Down Threshold:', config.autoscaling.rps.scaleDownThreshold);
  console.log('  Min Instances:', config.autoscaling.minInstances);
  console.log('  Max Instances:', config.autoscaling.maxInstances);
});
