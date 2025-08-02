const jwt = require('jsonwebtoken');

// Authentication middleware that doesn't log secrets
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // Log error without exposing token details
            console.error('Token verification failed for IP:', req.ip);
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        
        // Don't log user details or token
        req.user = user;
        next();
    });
};

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        console.error('Unauthorized admin access attempt from IP:', req.ip);
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

module.exports = {
    authenticateToken,
    requireAdmin
};