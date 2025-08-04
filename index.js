const express = require('express');
const userRoutes = require('./userRoutes');
const auditLogsRoute = require('./auditLogsRoute');
const manufacturerRoutes = require('./manufacturerRoutes');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ValveChain Sidecar API with User Management and Manufacturer Tokenization running' });
});

// Add user management routes
app.use('/api/auth', userRoutes);
app.use('/api', auditLogsRoute);

// Add manufacturer and valve tokenization routes
app.use('/api', manufacturerRoutes);

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
});
