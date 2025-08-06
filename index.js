const express = require('express');
const cors = require('cors');
const userRoutes = require('./userRoutes');
const auditLogsRoute = require('./auditLogsRoute');
const manufacturerRoutes = require('./manufacturerRoutes');
const distributorRoutes = require('./distributorRoutes');
const poRoutes = require('./poRoutes');
const blockchainService = require('./blockchainService');
const logger = require('./logger');
const { requestLogger, errorHandler, notFoundHandler } = require('./middleware');
const { metricsMiddleware, healthCheckWithMetrics } = require('./metrics');

// Load environment variables
require('dotenv').config();

// Define allowed origins for CORS
// ALLOWED_ORIGINS should be set in environment as comma-separated list (e.g., "http://localhost:3000,https://example.com")
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

const app = express();

// Configure CORS with allowed origins
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.length === 0) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Request logging and metrics middleware
app.use(requestLogger);
app.use(metricsMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const PORT = process.env.PORT || 3000;

// Initialize blockchain service
try {
  blockchainService.initialize();
  logger.info('Blockchain service initialized successfully');
} catch (error) {
  logger.error('Failed to initialize blockchain service', { error: error.message });
}

// Enhanced health check endpoint with metrics
app.get('/api/health', healthCheckWithMetrics);

// Ready check endpoint for Kubernetes
app.get('/api/ready', (req, res) => {
  // Add any readiness checks here (database connection, etc.)
  res.json({ 
    status: 'Ready',
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint
app.get('/api/metrics', (req, res) => {
  const { metricsCollector } = require('./metrics');
  res.json(metricsCollector.getMetrics());
});

// Add user management routes
app.use('/api/auth', userRoutes);
app.use('/api', auditLogsRoute);

// Add manufacturer and valve tokenization routes
app.use('/api', manufacturerRoutes);

// Add distributor management routes
app.use('/api', distributorRoutes);

// Add purchase order routes
app.use('/api', poRoutes);

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

// Add error handling and 404 middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`ValveChain Sidecar API running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
  
  console.log('User management endpoints available:');
  console.log('  POST /api/auth/register');
  console.log('  POST /api/auth/login');
  console.log('  POST /api/auth/test-token (development only)');
  console.log('  GET /api/auth/profile');
  console.log('  PUT /api/auth/profile');
  console.log('  PUT /api/auth/change-password');
  console.log('  GET /api/auth/users (admin only)');
  console.log('  GET /api/audit_logs (admin only)');
  console.log('');
  console.log('Manufacturer tokenization endpoints available:');
  console.log('  POST /api/manufacturers/validate');
  console.log('  GET /api/manufacturers');
  console.log('  GET /api/manufacturers/:id');
  console.log('  GET /api/manufacturers/:id/valves');
  console.log('  POST /api/valves/tokenize');
  console.log('  GET /api/valves');
  console.log('  GET /api/valves/:tokenId');
  console.log('');
  console.log('Distributor management endpoints available:');
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
  console.log('Purchase Order management endpoints available:');
  console.log('  POST /api/pos');
  console.log('  GET /api/pos');
  console.log('  GET /api/pos/:id');
  console.log('  GET /api/pos/number/:po_number');
  console.log('  PUT /api/pos/:id');
  console.log('  POST /api/pos/:id/approve');
  console.log('  POST /api/pos/:id/reject');
});
