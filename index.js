const express = require('express');
const cors = require('cors');
const userRoutes = require('./userRoutes');
const auditLogsRoute = require('./auditLogsRoute');
const manufacturerRoutes = require('./manufacturerRoutes');
const distributorRoutes = require('./distributorRoutes');
const poRoutes = require('./poRoutes');
const blockchainService = require('./blockchainService');

const app = express();

// CORS configuration for frontend-backend communication
const corsOptions = {
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
};

// Middleware setup
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

// Initialize blockchain service
blockchainService.initialize();

// Health check endpoint - Enhanced with version info
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ValveChain Sidecar API with User Management, Manufacturer Tokenization, and Distributor Management running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API documentation endpoint - lists all available endpoints
app.get('/api', (req, res) => {
  res.json({
    message: 'ValveChain API - Purchase Order Management System',
    version: '1.0.0',
    documentation: {
      'Authentication': {
        'POST /api/auth/register': 'Register new user account',
        'POST /api/auth/login': 'User authentication and JWT token generation',
        'POST /api/auth/test-token': 'Generate test token (development only)',
        'GET /api/auth/profile': 'Get current user profile (requires JWT)',
        'PUT /api/auth/profile': 'Update user profile (requires JWT)',
        'PUT /api/auth/change-password': 'Change user password (requires JWT)',
        'GET /api/auth/users': 'List all users (admin only)'
      },
      'Purchase Orders': {
        'POST /api/pos': 'Create new purchase order (requires JWT)',
        'GET /api/pos': 'List purchase orders with filtering/pagination (requires JWT)',
        'GET /api/pos/:id': 'Get purchase order by ID (requires JWT)',
        'GET /api/pos/number/:po_number': 'Get purchase order by PO number (requires JWT)',
        'PUT /api/pos/:id': 'Update purchase order - only if pending (requires JWT)',
        'POST /api/pos/:id/approve': 'Approve purchase order (requires JWT)',
        'POST /api/pos/:id/reject': 'Reject purchase order with reason (requires JWT)'
      },
      'Manufacturers': {
        'POST /api/manufacturers/validate': 'Validate manufacturer credentials',
        'GET /api/manufacturers': 'List all manufacturers',
        'GET /api/manufacturers/:id': 'Get manufacturer by ID',
        'GET /api/manufacturers/:id/valves': 'Get valves for manufacturer'
      },
      'Distributors': {
        'POST /api/distributors/register': 'Register new distributor',
        'GET /api/distributors': 'List all distributors',
        'GET /api/distributors/:id': 'Get distributor by ID',
        'PUT /api/distributors/:id': 'Update distributor information',
        'DELETE /api/distributors/:id': 'Deactivate distributor'
      },
      'Territories': {
        'GET /api/territories': 'List all territories',
        'GET /api/territories/type/:type': 'Get territories by type',
        'GET /api/territories/:id': 'Get territory by ID'
      }
    },
    notes: {
      authentication: 'Most endpoints require JWT token in Authorization header: Bearer <token>',
      errorHandling: 'All endpoints return consistent error format with error codes',
      cors: 'CORS enabled for cross-origin requests from frontend'
    }
  });
});

/* ========================================
 * LEGACY VALVECHAIN BLOCKCHAIN ENDPOINTS
 * ======================================== */
// Placeholder endpoints for future blockchain integration
// Currently disabled but maintain API compatibility

app.post('/api/register-valve', async (req, res) => {
  try {
    // TODO: Implement blockchain valve registration
    res.json({ 
      message: 'ValveChain blockchain integration temporarily disabled. Use tokenization endpoints instead.',
      suggestion: 'Use POST /api/valves/tokenize for valve registration',
      status: 'mock_mode'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Service temporarily unavailable',
      message: 'Blockchain service is in maintenance mode'
    });
  }
});

app.post('/api/transfer-valve', async (req, res) => {
  try {
    // TODO: Implement blockchain valve transfer
    res.json({ 
      message: 'ValveChain blockchain integration temporarily disabled. Use ownership transfer endpoints instead.',
      suggestion: 'Use POST /api/valves/transfer-ownership for valve transfers',
      status: 'mock_mode'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Service temporarily unavailable',
      message: 'Blockchain service is in maintenance mode'
    });
  }
});

app.post('/api/maintenance', async (req, res) => {
  try {
    // TODO: Implement maintenance logging
    res.json({ 
      message: 'ValveChain blockchain maintenance logging temporarily disabled.',
      status: 'mock_mode'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Service temporarily unavailable',
      message: 'Maintenance service is in development'
    });
  }
});

app.post('/api/repair-request', async (req, res) => {
  try {
    // TODO: Implement repair request system
    res.json({ 
      message: 'ValveChain repair request system temporarily disabled.',
      status: 'mock_mode'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Service temporarily unavailable',
      message: 'Repair request service is in development'
    });
  }
});

app.post('/api/repair', async (req, res) => {
  try {
    // TODO: Implement repair completion logging
    res.json({ 
      message: 'ValveChain repair completion logging temporarily disabled.',
      status: 'mock_mode'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Service temporarily unavailable',
      message: 'Repair service is in development'
    });
  }
});

/* ========================================
 * AUTHENTICATION ROUTES
 * ======================================== */
// All user authentication and management endpoints
// Includes registration, login, profile management, and admin functions
app.use('/api/auth', userRoutes);

/* ========================================
 * AUDIT LOG ROUTES
 * ======================================== */
// Admin-only audit logging endpoints for system monitoring
app.use('/api', auditLogsRoute);

/* ========================================
 * MANUFACTURER ROUTES
 * ======================================== */
// Manufacturer validation, tokenization, and valve management endpoints
app.use('/api', manufacturerRoutes);

/* ========================================
 * DISTRIBUTOR ROUTES
 * ======================================== */
// Distributor management, territory assignment, and relationship handling
app.use('/api', distributorRoutes);

/* ========================================
 * PURCHASE ORDER ROUTES
 * ======================================== */
// Complete purchase order lifecycle management (CRUD + approval workflow)
app.use('/api', poRoutes);

/* ========================================
 * SERVER STARTUP AND ENDPOINT LOGGING
 * ======================================== */
app.listen(PORT, () => {
  console.log('='.repeat(80));
  console.log(`🚀 ValveChain Sidecar API running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📅 Started: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
  
  console.log('\n📋 AUTHENTICATION ENDPOINTS:');
  console.log('  📝 POST /api/auth/register            - Register new user account');
  console.log('  🔐 POST /api/auth/login               - User authentication & JWT generation');
  console.log('  🧪 POST /api/auth/test-token          - Generate test token (dev only)');
  console.log('  👤 GET  /api/auth/profile             - Get current user profile');
  console.log('  ✏️  PUT  /api/auth/profile             - Update user profile');
  console.log('  🔑 PUT  /api/auth/change-password     - Change user password');
  console.log('  👥 GET  /api/auth/users               - List all users (admin only)');
  console.log('  📜 GET  /api/audit_logs               - Get audit logs (admin only)');
  
  console.log('\n📦 PURCHASE ORDER ENDPOINTS:');
  console.log('  ➕ POST /api/pos                      - Create new purchase order');
  console.log('  📋 GET  /api/pos                      - List POs with filtering/pagination');
  console.log('  🔍 GET  /api/pos/:id                  - Get purchase order by ID');
  console.log('  🔢 GET  /api/pos/number/:po_number    - Get purchase order by PO number');
  console.log('  ✏️  PUT  /api/pos/:id                  - Update PO (only if pending)');
  console.log('  ✅ POST /api/pos/:id/approve          - Approve purchase order');
  console.log('  ❌ POST /api/pos/:id/reject           - Reject purchase order');
  
  console.log('\n🏭 MANUFACTURER ENDPOINTS:');
  console.log('  ✔️  POST /api/manufacturers/validate   - Validate manufacturer credentials');
  console.log('  📋 GET  /api/manufacturers            - List all manufacturers');
  console.log('  🔍 GET  /api/manufacturers/:id        - Get manufacturer by ID');
  console.log('  🔧 GET  /api/manufacturers/:id/valves - Get valves for manufacturer');
  console.log('  🤝 GET  /api/manufacturers/:manufacturerId/distributors - Get manufacturer distributors');
  
  console.log('\n🚚 DISTRIBUTOR ENDPOINTS:');
  console.log('  📝 POST /api/distributors/register    - Register new distributor');
  console.log('  📋 GET  /api/distributors             - List all distributors');
  console.log('  🔍 GET  /api/distributors/:id         - Get distributor by ID');
  console.log('  ✏️  PUT  /api/distributors/:id         - Update distributor information');
  console.log('  🗑️  DELETE /api/distributors/:id       - Deactivate distributor');
  console.log('  🤝 POST /api/distributor-relationships/assign - Assign distributor rights');
  console.log('  ❌ DELETE /api/distributor-relationships/:relationshipId/revoke - Revoke rights');
  
  console.log('\n🗺️  TERRITORY ENDPOINTS:');
  console.log('  📋 GET  /api/territories              - List all territories');
  console.log('  🏷️  GET  /api/territories/type/:type   - Get territories by type');
  console.log('  🔍 GET  /api/territories/:id          - Get territory by ID');
  
  console.log('\n🔧 VALVE TOKENIZATION ENDPOINTS:');
  console.log('  🪙 POST /api/valves/tokenize          - Tokenize new valve');
  console.log('  📋 GET  /api/valves                   - List all valves');
  console.log('  🔍 GET  /api/valves/:tokenId          - Get valve by token ID');
  console.log('  🔄 POST /api/valves/transfer-ownership - Transfer valve ownership');
  
  console.log('\n🔗 BLOCKCHAIN INTEGRATION (MOCK MODE):');
  console.log('  🔗 POST /api/register-valve           - Register valve on blockchain (mock)');
  console.log('  🔄 POST /api/transfer-valve           - Transfer valve on blockchain (mock)');
  console.log('  🔧 POST /api/maintenance              - Log maintenance (mock)');
  console.log('  🆘 POST /api/repair-request           - Request repair (mock)');
  console.log('  ✅ POST /api/repair                   - Complete repair (mock)');
  
  console.log('\n📚 SYSTEM ENDPOINTS:');
  console.log('  ❤️  GET  /api/health                   - API health check');
  console.log('  📖 GET  /api                         - API documentation');
  
  console.log('\n' + '='.repeat(80));
  console.log('🔒 Security Features Enabled:');
  console.log('  • JWT Authentication on protected endpoints');
  console.log('  • Rate limiting to prevent API abuse');
  console.log('  • CORS enabled for cross-origin requests');
  console.log('  • Input validation and sanitization');
  
  console.log('\n💡 Usage Notes:');
  console.log('  • Include JWT token in Authorization header: Bearer <token>');
  console.log('  • All endpoints return consistent JSON responses');
  console.log('  • Visit GET /api for interactive documentation');
  console.log('  • Check GET /api/health for system status');
  console.log('='.repeat(80));
});
