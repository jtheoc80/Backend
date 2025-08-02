const express = require('express');
const userRoutes = require('./userRoutes');
const auditLogsRoute = require('./auditLogsRoute');

const app = express();
app.use(express.json());

// Add user management routes
app.use('/api/auth', userRoutes);
app.use('/api', auditLogsRoute);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'User Management API running' });
});

const PORT = process.env.TEST_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST /api/auth/register');
  console.log('  POST /api/auth/login');
  console.log('  GET /api/auth/profile');
  console.log('  PUT /api/auth/profile');
  console.log('  PUT /api/auth/change-password');
  console.log('  GET /api/auth/users (admin only)');
  console.log('  GET /api/audit_logs (admin only)');
});