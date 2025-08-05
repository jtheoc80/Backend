const express = require('express');
const userRoutes = require('./userRoutes');
const auditLogsRoute = require('./auditLogsRoute');
const manufacturerRoutes = require('./manufacturerRoutes');
const distributorRoutes = require('./distributorRoutes');
const organizationRoutes = require('./organizationRoutes');
const blockchainService = require('./blockchainService');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Initialize blockchain service
blockchainService.initialize();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ValveChain Sidecar API with User Management, Manufacturer Tokenization, and Distributor Management running' });
});

// Add user management routes
app.use('/api/auth', userRoutes);
app.use('/api', auditLogsRoute);

// Add manufacturer and valve tokenization routes
app.use('/api', manufacturerRoutes);

// Add distributor management routes
app.use('/api', distributorRoutes);

// Add organization and project management routes
app.use('/api', organizationRoutes);

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

// Start server
app.listen(PORT, () => {
  console.log(`ValveChain Sidecar API running on port ${PORT}`);
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
  console.log('Organization and project management endpoints available:');
  console.log('  POST /api/organizations/register');
  console.log('  GET /api/organizations/:id');
  console.log('  GET /api/organizations/:id/users');
  console.log('  POST /api/organizations/users/:userId/access');
  console.log('  GET /api/organizations/:id/projects');
  console.log('  POST /api/organizations/projects');
  console.log('  GET /api/projects/:id');
  console.log('  PUT /api/projects/:id');
  console.log('  POST /api/projects/:id/assign');
  console.log('  DELETE /api/projects/:id/users/:userId');
  console.log('  POST /api/projects/:id/complete');
  console.log('  GET /api/users/projects');
  console.log('  DELETE /api/projects/:id');
});
