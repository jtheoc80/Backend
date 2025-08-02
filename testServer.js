#!/usr/bin/env node

const express = require('express');
const authRoutes = require('./authRoutes');

// Create a simple test server
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 3001;

app.get('/health', (req, res) => {
    res.json({ status: 'Authentication server running', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Authentication server running on port ${PORT}`);
    console.log('Available endpoints:');
    console.log('  POST /auth/register - Register a new user');
    console.log('  POST /auth/login - Login with email/password');
    console.log('  POST /auth/request_password_reset - Request password reset');
    console.log('  POST /auth/reset_password - Reset password with token');
    console.log('  POST /auth/send_verification - Send email verification');
    console.log('  POST /auth/verify_email - Verify email with token');
    console.log('  POST /auth/setup_2fa - Setup two-factor authentication');
    console.log('  POST /auth/verify_2fa - Verify and enable 2FA');
    console.log('  GET /health - Health check');
});

module.exports = app;