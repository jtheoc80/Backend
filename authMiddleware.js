const jwt = require('jsonwebtoken');
const User = require('./userModel');

// JWT secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate JWT token
const generateToken = (userId, role) => {
    return jwt.sign(
        { 
            userId: userId,
            role: role 
        },
        JWT_SECRET,
        { 
            expiresIn: JWT_EXPIRES_IN 
        }
    );
};

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ 
                error: 'Access denied. No token provided.' 
            });
        }

        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;

        if (!token) {
            return res.status(401).json({ 
                error: 'Access denied. Invalid token format.' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get user from database
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ 
                error: 'Access denied. User not found.' 
            });
        }

        // Add user info to request object
        req.user = user;
        req.userId = user.id;
        req.userRole = user.role;
        
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Access denied. Invalid token.' 
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Access denied. Token expired.' 
            });
        } else {
            console.error('Auth middleware error:', error);
            return res.status(500).json({ 
                error: 'Internal server error during authentication.' 
            });
        }
    }
};

// Check if user has required role
const requireRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required.' 
            });
        }

        if (req.user.role !== requiredRole) {
            return res.status(403).json({ 
                error: `Access denied. ${requiredRole} role required.` 
            });
        }

        next();
    };
};

// Check if user is admin
const requireAdmin = requireRole('admin');

// Check if user is admin or owner of the resource
const requireAdminOrOwner = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Authentication required.' 
        });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = req.user.id === parseInt(req.params.id || req.params.userId);

    if (!isAdmin && !isOwner) {
        return res.status(403).json({ 
            error: 'Access denied. Admin privileges or resource ownership required.' 
        });
    }

    next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return next();
        }

        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;

        if (!token) {
            return next();
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get user from database
        const user = await User.findById(decoded.userId);
        
        if (user) {
            req.user = user;
            req.userId = user.id;
            req.userRole = user.role;
        }
        
        next();
    } catch (error) {
        // For optional auth, we don't fail on token errors
        next();
    }
};

// Rate limiting helper (basic implementation)
const rateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
    const requests = new Map();
    
    return (req, res, next) => {
        const clientId = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        
        if (!requests.has(clientId)) {
            requests.set(clientId, []);
        }
        
        const clientRequests = requests.get(clientId);
        
        // Remove old requests outside the window
        const validRequests = clientRequests.filter(timestamp => 
            now - timestamp < windowMs
        );
        
        if (validRequests.length >= maxRequests) {
            return res.status(429).json({
                error: 'Too many requests. Please try again later.'
            });
        }
        
        validRequests.push(now);
        requests.set(clientId, validRequests);
        
        next();
    };
};

module.exports = {
    generateToken,
    verifyToken,
    requireRole,
    requireAdmin,
    requireAdminOrOwner,
    optionalAuth,
    rateLimit,
    // Legacy exports for backward compatibility
    checkAdmin: requireAdmin
};