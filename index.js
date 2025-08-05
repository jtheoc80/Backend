const express = require('express');
const userRoutes = require('./userRoutes');
const auditLogsRoute = require('./auditLogsRoute');
const manufacturerRoutes = require('./manufacturerRoutes');
const distributorRoutes = require('./distributorRoutes');
const poRoutes = require('./poRoutes');
const blockchainService = require('./blockchainService');
const ValveGPTScheduler = require('./scheduler');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Initialize ValveGPT self-learning scheduler
let valveGPTScheduler = null;

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

// Add purchase order routes
app.use('/api', poRoutes);

// ValveGPT self-learning endpoints
app.get('/api/valvegpt/status', (req, res) => {
  if (!valveGPTScheduler) {
    return res.status(503).json({ error: 'ValveGPT scheduler not initialized' });
  }
  res.json(valveGPTScheduler.getStatus());
});

app.post('/api/valvegpt/run-once', async (req, res) => {
  if (!valveGPTScheduler) {
    return res.status(503).json({ error: 'ValveGPT scheduler not initialized' });
  }
  
  try {
    const results = await valveGPTScheduler.runOnce();
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/valvegpt/search', async (req, res) => {
  if (!valveGPTScheduler) {
    return res.status(503).json({ error: 'ValveGPT scheduler not initialized' });
  }

  const { query, topK = 5 } = req.body;
  
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is required and must be a string' });
  }

  try {
    const results = await valveGPTScheduler.searchContent(query, topK);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/valvegpt/sources', (req, res) => {
  if (!valveGPTScheduler) {
    return res.status(503).json({ error: 'ValveGPT scheduler not initialized' });
  }

  const { sources } = req.body;
  
  if (!Array.isArray(sources)) {
    return res.status(400).json({ error: 'Sources must be an array of URLs' });
  }

  try {
    valveGPTScheduler.updateCrawlerSources(sources);
    res.json({ success: true, message: 'Crawler sources updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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
app.listen(PORT, async () => {
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
  console.log('Purchase Order management endpoints available:');
  console.log('  POST /api/pos');
  console.log('  GET /api/pos');
  console.log('  GET /api/pos/:id');
  console.log('  GET /api/pos/number/:po_number');
  console.log('  PUT /api/pos/:id');
  console.log('  POST /api/pos/:id/approve');
  console.log('  POST /api/pos/:id/reject');
  console.log('');
  console.log('ValveGPT Self-Learning endpoints available:');
  console.log('  GET /api/valvegpt/status');
  console.log('  POST /api/valvegpt/run-once');
  console.log('  POST /api/valvegpt/search');
  console.log('  POST /api/valvegpt/sources');

  // Initialize ValveGPT scheduler
  try {
    console.log('');
    console.log('Initializing ValveGPT Self-Learning System...');
    valveGPTScheduler = new ValveGPTScheduler();
    await valveGPTScheduler.initialize();
    
    // Start scheduler if enabled
    if (process.env.VALVEGPT_AUTO_START !== 'false') {
      const schedule = process.env.VALVEGPT_SCHEDULE || '0 */6 * * *'; // Default: every 6 hours
      valveGPTScheduler.start(schedule);
      console.log(`ValveGPT scheduler started with schedule: ${schedule}`);
    } else {
      console.log('ValveGPT scheduler initialized but not started (VALVEGPT_AUTO_START=false)');
    }
  } catch (error) {
    console.error('Failed to initialize ValveGPT scheduler:', error);
    console.error('ValveGPT self-learning features will be unavailable');
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  
  if (valveGPTScheduler) {
    await valveGPTScheduler.shutdown();
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  
  if (valveGPTScheduler) {
    await valveGPTScheduler.shutdown();
  }
  
  process.exit(0);
});
