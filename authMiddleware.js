// Simple in-memory rate limiting middleware
class RateLimiter {
    constructor() {
        this.attempts = new Map(); // ip -> { count, lastAttempt }
    }

    // Rate limiting middleware
    limit(maxAttempts = 5, windowMinutes = 15) {
        return (req, res, next) => {
            const ip = req.ip || req.connection.remoteAddress;
            const now = Date.now();
            const windowMs = windowMinutes * 60 * 1000;

            if (!this.attempts.has(ip)) {
                this.attempts.set(ip, { count: 1, lastAttempt: now });
                return next();
            }

            const record = this.attempts.get(ip);
            
            // Reset count if window has passed
            if (now - record.lastAttempt > windowMs) {
                record.count = 1;
                record.lastAttempt = now;
                return next();
            }

            // Increment count
            record.count++;
            record.lastAttempt = now;

            if (record.count > maxAttempts) {
                return res.status(429).json({
                    error: 'Too many attempts. Please try again later.',
                    retryAfter: Math.ceil((windowMs - (now - record.firstAttempt)) / 1000)
                });
            }

            next();
        };
    }

    // Clean up old entries periodically
    cleanup() {
        const now = Date.now();
        const maxAge = 60 * 60 * 1000; // 1 hour

        for (const [ip, record] of this.attempts.entries()) {
            if (now - record.lastAttempt > maxAge) {
                this.attempts.delete(ip);
            }
        }
    }
}

// JWT verification middleware
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer token

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const secret = process.env.JWT_SECRET || 'default-secret';
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Input validation middleware
const validateEmail = (req, res, next) => {
    const { email } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'Valid email address required' });
    }
    
    next();
};

const validatePassword = (req, res, next) => {
    const { password } = req.body;
    
    if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    
    next();
};

const rateLimiter = new RateLimiter();

// Clean up rate limiter every hour
setInterval(() => {
    rateLimiter.cleanup();
}, 60 * 60 * 1000);

module.exports = {
    rateLimiter,
    verifyToken,
    validateEmail,
    validatePassword
};