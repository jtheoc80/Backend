require('dotenv').config();
const express = require('express');
const auditLogsRoute = require('./auditLogsRoute');
const logActivity = require('./logActivity');
const db = require('./database');
const MockDatabase = require('./mockDatabase');

const app = express();
app.use(express.json());

// Use mock database for testing
const mockDb = new MockDatabase();

// Replace the real db with mock db for testing
const originalDb = require('./middleware').db;
require('./middleware').db = mockDb;

// Initialize some test data
async function initTestData() {
    console.log('Initializing test data...');
    await logActivity(mockDb, 'user-1', 'login', { ip: '192.168.1.1' }, 'success');
    await logActivity(mockDb, 'user-2', 'logout', { ip: '192.168.1.2' }, 'success');
    await logActivity(mockDb, 'user-1', 'update-profile', { field: 'email' }, 'success');
    await logActivity(mockDb, 'admin-1', 'delete-user', { deletedUserId: 'user-3' }, 'success');
    await logActivity(mockDb, 'user-2', 'login', { ip: '192.168.1.3' }, 'failed');
    console.log('Test data initialized');
}

// Routes
app.use('/api', auditLogsRoute);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Audit logs API server running' });
});

// Test endpoint to create audit logs
app.post('/api/test-log', async (req, res) => {
    try {
        const { userId, action, metadata, outcome } = req.body;
        await logActivity(mockDb, userId, action, metadata, outcome);
        res.json({ success: true, message: 'Audit log created' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create audit log' });
    }
});

const PORT = process.env.PORT || 3001;

async function startServer() {
    await initTestData();
    app.listen(PORT, () => {
        console.log(`🚀 Audit logs API server running on port ${PORT}`);
        console.log(`📊 Try these endpoints:`);
        console.log(`   GET http://localhost:${PORT}/health`);
        console.log(`   GET http://localhost:${PORT}/api/audit_logs (requires admin token)`);
        console.log(`   POST http://localhost:${PORT}/api/test-log`);
    });
}

startServer().catch(console.error);