require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeDatabase, testConnection } = require('./database');
const { rateLimit } = require('./middleware');

// Import routes
const userRoutes = require('./userRoutes');
const authRoutes = require('./authRoutes');
const auditLogsRoute = require('./auditLogsRoute');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all routes
app.use(rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ValveChain Backend API running',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', auditLogsRoute);

// Error handling middleware
app.use((err, req, res, next) => {
    // Log full error details for debugging
    console.error(err.stack);
    // Only send generic error details to client, even in development
    res.status(500).json({ 
        error: 'Something went wrong!',
        code: err.code || undefined // Optionally include a safe error code
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
const startServer = async () => {
    try {
        // Test database connection
        console.log('Testing database connection...');
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('Failed to connect to database. Please check your database configuration.');
            process.exit(1);
        }

        // Initialize database schema
        console.log('Initializing database schema...');
        await initializeDatabase();

        // Start server
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`ValveChain Backend API running on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Received SIGINT. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;