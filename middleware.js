const jwt = require('jsonwebtoken');
const { db } = require('./database');

// JWT secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }

        try {
            // Fetch user details from database
            const result = await db.query(
                'SELECT id, username, email, role FROM users WHERE id = $1',
                [decoded.userId]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({ error: 'User not found' });
            }

            req.user = result.rows[0];
            next();
        } catch (dbErr) {
            console.error('Database error in auth middleware:', dbErr);
            return res.status(500).json({ error: 'Authentication failed' });
        }
    });
};

// Admin check middleware
const checkAdmin = (req, res, next) => {
    // First authenticate the token
    authenticateToken(req, res, () => {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ error: 'Admin access required' });
        }
    });
};

// User authorization middleware (can be used for user-specific resources)
const checkUserAccess = (req, res, next) => {
    authenticateToken(req, res, () => {
        const requestedUserId = req.params.userId || req.body.userId;
        
        // Allow access if user is admin or accessing their own data
        if (req.user.role === 'admin' || req.user.id == requestedUserId) {
            next();
        } else {
            res.status(403).json({ error: 'Access denied' });
        }
    });
};

// Rate limiting middleware (basic implementation)
const rateLimitStore = new Map();

const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    return (req, res, next) => {
        const clientId = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old entries
        for (const [key, value] of rateLimitStore.entries()) {
            if (value.timestamp < windowStart) {
                rateLimitStore.delete(key);
            }
        }

        // Check current requests
        const clientRequests = rateLimitStore.get(clientId) || { count: 0, timestamp: now };
        
        if (clientRequests.timestamp < windowStart) {
            // Reset count for new window
            clientRequests.count = 1;
            clientRequests.timestamp = now;
        } else {
            clientRequests.count++;
        }

        rateLimitStore.set(clientId, clientRequests);

        if (clientRequests.count > maxRequests) {
            return res.status(429).json({ 
                error: 'Too many requests', 
                retryAfter: Math.ceil((windowMs - (now - clientRequests.timestamp)) / 1000)
            });
        }

        next();
    };
};

module.exports = {
    db,
    authenticateToken,
    checkAdmin,
    checkUserAccess,
    rateLimit,
    JWT_SECRET
};